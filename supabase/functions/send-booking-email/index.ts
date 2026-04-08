import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) throw new Error('Missing booking_id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: booking, error } = await supabase
      .from('bubu_bookings')
      .select(`*, time_slots:bubu_time_slots(date, start_time, end_time)`)
      .eq('id', booking_id)
      .single();

    if (error || !booking) throw new Error('Booking not found');
    if (!booking.email) throw new Error('Booking has no email address');

    const slot = booking.time_slots;
    const address = booking.address_from || [booking.city, booking.district, booking.address_detail].filter(Boolean).join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>預約確認</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9FAFB;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px;color:white;text-align:center;">
      <div style="font-size:48px;margin-bottom:12px;">✅</div>
      <h1 style="margin:0;font-size:22px;">預約成功確認</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;color:#374151;margin:0 0 24px;">
        <strong>${booking.customer_name}</strong> 您好，我們已收到您的到府估價預約！
      </p>

      <div style="background:#F8F9FF;border-radius:10px;padding:20px;margin-bottom:24px;">
        <h3 style="font-size:13px;color:#9CA3AF;margin:0 0 12px;text-transform:uppercase;">預約詳情</h3>
        ${slot ? `
        <div style="display:flex;gap:12px;margin-bottom:8px;">
          <span style="font-size:13px;color:#9CA3AF;min-width:60px;">日期</span>
          <span style="font-size:14px;font-weight:600;color:#1F2937;">${slot.date}</span>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:8px;">
          <span style="font-size:13px;color:#9CA3AF;min-width:60px;">時段</span>
          <span style="font-size:14px;font-weight:600;color:#1F2937;">${slot.start_time?.slice(0,5)} – ${slot.end_time?.slice(0,5)}</span>
        </div>` : ''}
        ${address ? `
        <div style="display:flex;gap:12px;margin-bottom:8px;">
          <span style="font-size:13px;color:#9CA3AF;min-width:60px;">地址</span>
          <span style="font-size:14px;color:#1F2937;">${address}</span>
        </div>` : ''}
        ${booking.is_waitlist ? `
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;margin-top:8px;">
          <p style="margin:0;font-size:13px;color:#92400E;">⚠️ 此為候補預約，有名額釋出將優先聯繫您</p>
        </div>` : ''}
      </div>

      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#065F46;line-height:1.6;">
          我們已收到您的估價預約，將於 <strong>24 小時內</strong>以電話或 LINE 與您確認。<br>
          如有緊急需求，請直接撥打 <strong>02-77550920</strong>。
        </p>
      </div>

      <p style="font-size:13px;color:#9CA3AF;text-align:center;margin:0;">
        步步搬家　|　台北市信義區信義路五段109號1樓<br>
        電話：02-77550920
      </p>
    </div>
  </div>
</body>
</html>`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY not set');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'steps@bubumoving.com.tw',
        to: booking.email,
        subject: '【步步搬家】到府估價預約確認',
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend error: ${errBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
