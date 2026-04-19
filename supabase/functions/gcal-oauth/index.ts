// Google Calendar OAuth flow
// Actions:
//   - start: 回傳 OAuth 授權 URL
//   - callback: 處理 redirect，交換 token 後存入 DB
//   - disconnect: 撤銷授權
//   - status: 查詢連線狀態

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// OAuth scopes — 讀寫行事曆事件
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
    const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') ?? '';

    // 驗證呼叫者為最高管理者（start / disconnect / status）
    const verifyAdmin = async (authHeader: string | null) => {
      if (!authHeader) throw new Error('未授權');
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user: caller } } = await userClient.auth.getUser();
      if (!caller) throw new Error('授權無效');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabase.from('bubu_app_users')
        .select('role').eq('id', caller.id).maybeSingle();
      if (profile?.role !== 'admin') throw new Error('僅最高管理者可執行');
      return { caller, supabase };
    };

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? new URL(req.url).searchParams.get('action');

    // ── start: 產生授權 URL ────────────────────────────────────────────────
    if (action === 'start') {
      await verifyAdmin(req.headers.get('Authorization'));
      if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
        throw new Error('請先在 Supabase Secrets 設定 GOOGLE_CLIENT_ID 與 GOOGLE_REDIRECT_URI');
      }
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      return ok({ ok: true, auth_url: authUrl.toString() });
    }

    // ── callback: 交換 code → token，寫入 DB ──────────────────────────────
    if (action === 'callback') {
      const { code } = body;
      if (!code) throw new Error('缺少 code');
      const { supabase } = await verifyAdmin(req.headers.get('Authorization'));

      // 1. 用 code 換 token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(`交換 token 失敗：${tokenData.error_description ?? tokenData.error}`);

      // 2. 取得使用者資訊
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      // 3. 預設用主要行事曆
      const calendarId = 'primary';
      const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const calData = await calRes.json();

      // 4. Upsert 設定（singleton）
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
      // 先清舊設定再寫新的（singleton index 保護）
      await supabase.from('bubu_gcal_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error: insErr } = await supabase.from('bubu_gcal_config').insert({
        is_connected: true,
        calendar_id: calendarId,
        calendar_summary: calData.summary ?? userInfo.email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        connected_email: userInfo.email,
      });
      if (insErr) throw new Error(`寫入設定失敗：${insErr.message}`);

      return ok({ ok: true, email: userInfo.email, calendar: calData.summary });
    }

    // ── disconnect: 撤銷授權 ──────────────────────────────────────────────
    if (action === 'disconnect') {
      const { supabase } = await verifyAdmin(req.headers.get('Authorization'));
      const { data: cfg } = await supabase.from('bubu_gcal_config')
        .select('access_token').maybeSingle();
      if (cfg?.access_token) {
        // 通知 Google 撤銷 token（非關鍵，失敗不影響）
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${cfg.access_token}`, { method: 'POST' });
        } catch (_) { /* ignore */ }
      }
      await supabase.from('bubu_gcal_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return ok({ ok: true });
    }

    // ── status: 查詢連線狀態 ───────────────────────────────────────────────
    if (action === 'status') {
      await verifyAdmin(req.headers.get('Authorization'));
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await supabase.from('bubu_gcal_config')
        .select('is_connected, connected_email, calendar_summary, calendar_id, last_synced_at')
        .maybeSingle();
      return ok({ ok: true, config: data });
    }

    throw new Error(`未知 action: ${action}`);
  } catch (err: any) {
    console.error('gcal-oauth error:', err);
    return ok({ ok: false, error: err.message ?? '操作失敗' });
  }
});
