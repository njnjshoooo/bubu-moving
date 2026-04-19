import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[create-admin] request received');

    // ── 1. 驗證呼叫者是 admin（function 內自行驗證，不靠 gateway）──────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('未提供授權，請重新登入');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) throw new Error('授權無效，請重新登入');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: callerProfile } = await supabase.from('bubu_app_users')
      .select('role').eq('id', caller.id).maybeSingle();
    if (callerProfile?.role !== 'admin') {
      throw new Error('僅最高管理者可新增管理帳號');
    }

    // ── 2. 解析 body ──────────────────────────────────────────────────────
    const { email, display_name, role } = await req.json();

    if (!email || !display_name || !role) {
      return new Response(JSON.stringify({ ok: false, error: '缺少必要欄位' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['admin', 'manager'].includes(role)) {
      return new Response(JSON.stringify({ ok: false, error: '無效的角色' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[create-admin] creating user:', email, 'role:', role);

    // 1. 建立 auth 用戶（role 帶入 metadata，讓 trigger 可直接寫入正確角色）
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name, role },
    });
    if (authErr) throw authErr;
    const userId = authData.user.id;

    // 2. Upsert bubu_app_users（避免與 handle_new_user trigger 衝突）
    const { error: userErr } = await supabase.from('bubu_app_users').upsert({
      id: userId,
      role,
      display_name,
    }, { onConflict: 'id' });
    if (userErr) throw userErr;

    // 3. 產生密碼設定連結並寄邀請信（非關鍵，失敗不影響帳號建立）
    try {
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
      });
      if (!linkErr && linkData?.properties?.action_link) {
        const resetLink = linkData.properties.action_link;
        const resendKey = Deno.env.get('RESEND_API_KEY');
        if (resendKey) {
          const roleText = role === 'admin' ? '最高管理者' : '主管';
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'noreply@bubu-moving.com.tw',
              to: email,
              subject: '【步步搬家】您已被邀請為管理帳號',
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
                  <h2 style="color:#1f2937;margin-bottom:8px;">歡迎加入步步搬家管理團隊</h2>
                  <p style="color:#6b7280;">您好 ${display_name}，</p>
                  <p style="color:#6b7280;">您已被設定為<strong style="color:#374151;">「${roleText}」</strong>角色。</p>
                  <p style="color:#6b7280;">請點擊下方按鈕設定您的登入密碼：</p>
                  <a href="${resetLink}"
                    style="display:inline-block;margin:16px 0;padding:12px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-weight:600;">
                    設定我的密碼
                  </a>
                  <p style="color:#9ca3af;font-size:12px;">此連結有效期為 24 小時。如有問題請聯絡系統管理員。</p>
                </div>
              `,
            }),
          });
        }
      }
    } catch (emailErr) {
      console.warn('Email send failed (non-fatal):', emailErr);
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('create-admin error:', err);
    return new Response(JSON.stringify({ ok: false, error: err.message ?? '建立失敗' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
