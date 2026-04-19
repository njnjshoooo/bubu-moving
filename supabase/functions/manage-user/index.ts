import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ── 驗證呼叫者是最高管理者 ────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('未提供授權，請重新登入');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) throw new Error('授權無效，請重新登入');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerProfile } = await supabase.from('bubu_app_users')
      .select('role').eq('id', caller.id).maybeSingle();
    if (callerProfile?.role !== 'admin') throw new Error('僅最高管理者可執行此操作');

    // ── 解析請求 ──────────────────────────────────────────────────────────
    const body = await req.json();
    const { action, user_id } = body;
    if (!action || !user_id) throw new Error('缺少 action 或 user_id');

    console.log(`[manage-user] action=${action} user_id=${user_id}`);

    // ── Action: get_user（取得 email + 基本資料）──────────────────────────
    if (action === 'get_user') {
      const { data: authData } = await supabase.auth.admin.getUserById(user_id);
      const { data: profile } = await supabase.from('bubu_app_users')
        .select('*').eq('id', user_id).maybeSingle();
      const { data: consultant } = await supabase.from('bubu_consultants')
        .select('*').eq('user_id', user_id).maybeSingle();
      return ok({
        ok: true,
        email: authData?.user?.email ?? null,
        email_confirmed: !!authData?.user?.email_confirmed_at,
        last_sign_in_at: authData?.user?.last_sign_in_at ?? null,
        profile,
        consultant,
      });
    }

    // ── Action: update_profile（更新姓名、電話、地址）─────────────────────
    if (action === 'update_profile') {
      const { display_name, phone, address } = body;
      if (!display_name) throw new Error('姓名為必填');

      // 1. bubu_app_users
      const { error: e1 } = await supabase.from('bubu_app_users').update({
        display_name,
        phone: phone || null,
      }).eq('id', user_id);
      if (e1) throw new Error(`更新 app_users 失敗：${e1.message}`);

      // 2. bubu_consultants（若該使用者是顧問才更新）
      const { data: existingConsultant } = await supabase.from('bubu_consultants')
        .select('id').eq('user_id', user_id).maybeSingle();
      if (existingConsultant) {
        const { error: e2 } = await supabase.from('bubu_consultants').update({
          display_name,
          phone: phone || null,
          address: address || null,
        }).eq('user_id', user_id);
        if (e2) throw new Error(`更新 consultants 失敗：${e2.message}`);
      }

      // 3. auth.users metadata
      await supabase.auth.admin.updateUserById(user_id, {
        user_metadata: { display_name },
      });

      return ok({ ok: true });
    }

    // ── Action: reset_password / resend_verification ─────────────────────
    if (action === 'reset_password' || action === 'resend_verification') {
      const { data: authData } = await supabase.auth.admin.getUserById(user_id);
      const email = authData?.user?.email;
      if (!email) throw new Error('找不到使用者 email');

      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
      });
      if (linkErr) throw new Error(`產生連結失敗：${linkErr.message}`);
      const actionLink = linkData?.properties?.action_link;
      if (!actionLink) throw new Error('無法取得設定連結');

      const displayName = authData?.user?.user_metadata?.display_name ?? '您好';
      const isReset = action === 'reset_password';
      const subject = isReset
        ? '【步步搬家】重設您的密碼'
        : '【步步搬家】設定您的帳號密碼';
      const heading = isReset ? '重設密碼' : '設定密碼';
      const desc = isReset
        ? '您的密碼已由管理員協助重設，請點擊下方連結設定新密碼：'
        : '請點擊下方連結設定您的帳號密碼：';

      const resendKey = Deno.env.get('RESEND_API_KEY');
      let emailSent = false;
      if (resendKey) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'steps@bubu-moving.com.tw',
            to: email,
            subject,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
                <h2 style="color:#1f2937;margin-bottom:8px;">${heading}</h2>
                <p style="color:#6b7280;">您好 ${displayName}，</p>
                <p style="color:#6b7280;">${desc}</p>
                <a href="${actionLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#EA580C;color:white;text-decoration:none;border-radius:8px;font-weight:600;">${heading}</a>
                <p style="color:#9ca3af;font-size:12px;">此連結 24 小時內有效。若非您本人操作，請忽略此信。</p>
                <p style="color:#9ca3af;font-size:12px;">步步搬家 BuBu Moving</p>
              </div>`,
          }),
        });
        emailSent = emailRes.ok;
      }

      return ok({ ok: true, email, email_sent: emailSent, action_link: actionLink });
    }

    throw new Error(`未知的 action: ${action}`);
  } catch (err: any) {
    console.error('manage-user error:', err);
    return ok({ ok: false, error: err.message ?? '操作失敗' });
  }
});
