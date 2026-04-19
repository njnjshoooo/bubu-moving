// 接收 Google Calendar push notifications，執行反向同步
// Google 會發 POST 請求，header 包含 X-Goog-* 資訊
// 我們不依賴 body（Google 不傳完整 event data），而是用 incremental sync 拉取

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

async function getValidToken(supabase: any, cfg: any) {
  const now = Date.now();
  const exp = cfg.token_expires_at ? new Date(cfg.token_expires_at).getTime() : 0;
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
  if (!res.ok) throw new Error(`Token 刷新失敗`);
  const newExp = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
  await supabase.from('bubu_gcal_config').update({
    access_token: data.access_token,
    token_expires_at: newExp,
  }).eq('id', cfg.id);
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Google 的 push 通知只有 header 沒 body
    const channelId = req.headers.get('X-Goog-Channel-ID');
    const resourceState = req.headers.get('X-Goog-Resource-State');

    // sync 事件僅作為訂閱確認 ack
    if (resourceState === 'sync') {
      return new Response('', { status: 200 });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 驗證 channel 是我們自己訂閱的
    const { data: cfg } = await supabase.from('bubu_gcal_config')
      .select('*').maybeSingle();
    if (!cfg || cfg.webhook_channel_id !== channelId) {
      return new Response('unknown channel', { status: 404 });
    }

    const accessToken = await getValidToken(supabase, cfg);
    const calendarId = encodeURIComponent(cfg.calendar_id ?? 'primary');

    // 使用 sync token incremental 拉取變更
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
    if (cfg.last_sync_token) {
      url.searchParams.set('syncToken', cfg.last_sync_token);
    } else {
      // 首次同步 —— 以當前時間往後拉
      url.searchParams.set('timeMin', new Date().toISOString());
      url.searchParams.set('singleEvents', 'true');
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      // 410 = sync token 失效，清掉重來
      if (res.status === 410) {
        await supabase.from('bubu_gcal_config')
          .update({ last_sync_token: null }).eq('id', cfg.id);
      }
      return new Response(JSON.stringify({ error: data }), { status: 500 });
    }

    // 處理每個變更的 event
    for (const ev of (data.items ?? [])) {
      if (ev.status === 'cancelled') {
        // Google 端取消 → 把 Supabase 預約狀態改為「已取消」
        await supabase.from('bubu_bookings')
          .update({ status: '已取消' })
          .eq('gcal_event_id', ev.id);
      } else {
        // Google 端有更新 → 嘗試更新對應 booking 的備註
        // （不改時間，避免循環同步；時間變更仍由後台主導）
        const { data: booking } = await supabase.from('bubu_bookings')
          .select('id, notes').eq('gcal_event_id', ev.id).maybeSingle();
        if (booking && ev.description && !booking.notes?.includes('[from GCal]')) {
          // 只在備註沒同步過時覆寫，避免無限循環
          // 使用者可在 Google Calendar 編輯描述，我們僅記錄最新描述
          await supabase.from('bubu_bookings')
            .update({ notes: `${ev.description}\n\n[from GCal]` })
            .eq('id', booking.id);
        }
      }
    }

    // 更新 sync token
    if (data.nextSyncToken) {
      await supabase.from('bubu_gcal_config')
        .update({ last_sync_token: data.nextSyncToken, last_synced_at: new Date().toISOString() })
        .eq('id', cfg.id);
    }

    return new Response('', { status: 200 });
  } catch (err: any) {
    console.error('gcal-webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
