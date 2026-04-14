import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { email, display_name, phone, address } = await req.json();
    if (!email || !display_name) throw new Error('email 和 display_name 為必填');

    // Use service role key to create auth user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Create auth user (email_confirm: true = 直接啟用，不需要驗信)
    const { data: userData, error: userErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name },
    });
    if (userErr) throw new Error(`建立帳號失敗：${userErr.message}`);
    const userId = userData.user.id;

    // 2. Add to bubu_app_users with role = 'consultant'
    const { error: profileErr } = await supabase.from('bubu_app_users').insert({
      id: userId,
      role: 'consultant',
      display_name,
      phone: phone || null,
    });
    if (profileErr) throw new Error(`寫入 app_users 失敗：${profileErr.message}`);

    // 3. Add to bubu_consultants
    const { error: consultantErr } = await supabase.from('bubu_consultants').insert({
      user_id: userId,
      display_name,
      phone: phone || null,
      address: address || null,
      is_active: true,
    });
    if (consultantErr) throw new Error(`寫入 consultants 失敗：${consultantErr.message}`);

    // 4. Send password-setup email (recovery link)
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    if (!linkErr && linkData?.properties?.action_link) {
      // Try sending via Resend if key is available
      const resendKey = Deno.env.get('RESEND_API_KEY');
      if (resendKey) {
        const html = `
<p>您好，${display_name}！</p>
<p>步步搬家已為您建立顧問帳號（帳號：${email}）。</p>
<p>請點擊以下連結設定您的密碼：</p>
<p><a href="${linkData.properties.action_link}" style="background:#4F46E5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">設定密碼</a></p>
<p style="color:#888;font-size:12px;">此連結 24 小時內有效。若非您本人，請忽略此信。</p>
<p>步步搬家 團隊</p>`;
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'steps@bubumoving.com.tw',
            to: email,
            subject: '【步步搬家】顧問帳號已建立，請設定密碼',
            html,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message ?? '建立失敗' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
