// 將 bubu_bookings 變更推送到 Google Calendar
// Actions:
//   - upsert: 建立或更新 event（新預約 / 時段變更）
//   - delete: 刪除 event（預約被刪除 / 取消）

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// 自動刷新 access_token
async function getValidToken(supabase: any, cfg: any) {
  const now = Date.now();
  const exp = cfg.token_expires_at ? new Date(cfg.token_expires_at).getTime() : 0;
  // 提前 60 秒刷新
  if (exp > now + 60_000) return cfg.access_token;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: cfg.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Token 刷新失敗：${data.error_description ?? data.error}`);
  const newExp = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
  await supabase.from('bubu_gcal_config').update({
    access_token: data.access_token,
    token_expires_at: newExp,
  }).eq('id', cfg.id);
  return data.access_token;
}

// 建 event payload
function buildEventPayload(booking: any, slot: any) {
  if (!slot) return null;
  // 時區用 Asia/Taipei
  const startDateTime = `${slot.date}T${slot.start_time}+08:00`;
  const endDateTime = `${slot.date}T${slot.end_time}+08:00`;
  const summary = `[${booking.status}] ${booking.customer_name} 到府估價`;
  const descLines = [
    `客戶：${booking.customer_name}`,
    `電話：${booking.phone}`,
    booking.address_from ? `舊址：${booking.address_from}` : '',
    booking.address_to ? `新址：${booking.address_to}` : '',
    booking.moving_date ? `預計搬家日：${booking.moving_date}` : '',
    booking.notes ? `備註：${booking.notes}` : '',
    booking.is_waitlist ? '⚠️ 候補名單' : '',
  ].filter(Boolean);
  return {
    summary,
    description: descLines.join('\n'),
    location: booking.address_from ?? undefined,
    start: { dateTime: startDateTime, timeZone: 'Asia/Taipei' },
    end: { dateTime: endDateTime, timeZone: 'Asia/Taipei' },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { action, booking_id } = await req.json();
    if (!action || !booking_id) throw new Error('缺少 action 或 booking_id');

    // 取得 GCal 設定
    const { data: cfg } = await supabase.from('bubu_gcal_config')
      .select('*').maybeSingle();
    if (!cfg?.is_connected) {
      // 未連線時靜默跳過（不要讓前端操作失敗）
      return ok({ ok: true, skipped: 'not connected' });
    }

    const accessToken = await getValidToken(supabase, cfg);
    const calendarId = encodeURIComponent(cfg.calendar_id ?? 'primary');

    // ── action: delete ───────────────────────────────────────────────────
    if (action === 'delete') {
      const { data: booking } = await supabase.from('bubu_bookings')
        .select('gcal_event_id').eq('id', booking_id).maybeSingle();
      const eventId = booking?.gcal_event_id;
      if (eventId) {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok && res.status !== 404 && res.status !== 410) {
          const err = await res.text();
          throw new Error(`刪除 event 失敗：${err}`);
        }
      }
      return ok({ ok: true, deleted: !!eventId });
    }

    // ── action: upsert ───────────────────────────────────────────────────
    if (action === 'upsert') {
      // 取 booking 與關聯 slot
      const { data: booking } = await supabase.from('bubu_bookings')
        .select('*, time_slots:bubu_time_slots(date, start_time, end_time)')
        .eq('id', booking_id).maybeSingle();
      if (!booking) throw new Error('找不到預約單');

      // 沒時段 → 無法建立 event（還在未指定階段）
      if (!booking.time_slots) {
        return ok({ ok: true, skipped: 'no time slot' });
      }

      // 取消狀態 → 若已有 event 就刪除
      if (booking.status === '已取消' && booking.gcal_event_id) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${booking.gcal_event_id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
        );
        await supabase.from('bubu_bookings')
          .update({ gcal_event_id: null }).eq('id', booking_id);
        return ok({ ok: true, cancelled: true });
      }

      const payload = buildEventPayload(booking, booking.time_slots);
      if (!payload) throw new Error('無法建立 payload');

      let eventId = booking.gcal_event_id;
      let res, data;
      if (eventId) {
        // Update
        res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        // 若原 event 已被手動刪除（404 / 410），改為 Insert
        if (res.status === 404 || res.status === 410) {
          eventId = null;
        }
      }
      if (!eventId) {
        res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
      }
      data = await res!.json();
      if (!res!.ok) throw new Error(`寫入 event 失敗：${data.error?.message ?? 'unknown'}`);

      // 回寫 event_id
      if (data.id && data.id !== booking.gcal_event_id) {
        await supabase.from('bubu_bookings')
          .update({ gcal_event_id: data.id }).eq('id', booking_id);
      }

      // 更新 last_synced_at
      await supabase.from('bubu_gcal_config')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', cfg.id);

      return ok({ ok: true, event_id: data.id });
    }

    throw new Error(`未知 action: ${action}`);
  } catch (err: any) {
    console.error('gcal-sync-booking error:', err);
    return ok({ ok: false, error: err.message ?? '同步失敗' });
  }
});
