import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { quote_id } = await req.json();
    if (!quote_id) throw new Error('Missing quote_id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load full quote data
    const { data: quote, error: qErr } = await supabase
      .from('bubu_quotes')
      .select(`
        *,
        quote_items:bubu_quote_items(*),
        staff_schedule:bubu_staff_schedule_items(*),
        quote_schedule:bubu_quote_schedule_items(*),
        checked_notes:bubu_quote_checked_notes(note_id, note:bubu_quote_note_templates(content, sort_order))
      `)
      .eq('id', quote_id)
      .single();

    if (qErr || !quote) throw new Error('Quote not found');
    if (!quote.email) throw new Error('Quote has no email address');

    // Build items HTML — use current category name '計時人員'
    const CATS = ['搬家車趟費', '計時人員', '包材費'];
    const itemsHtml = CATS.map(cat => {
      const catItems = (quote.quote_items ?? []).filter((i: any) => i.category === cat);
      if (catItems.length === 0) return '';
      const rows = catItems.map((i: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${i.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;">NT$${i.unit_price.toLocaleString()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">NT$${(i.unit_price * i.quantity).toLocaleString()}</td>
        </tr>`).join('');
      return `
        <tr><td colspan="4" style="padding:10px 12px;background:#f8f9ff;font-weight:600;color:#4F46E5;">${cat}</td></tr>
        ${rows}`;
    }).join('');

    // Staff schedule HTML
    let staffHtml = '';
    if ((quote.staff_schedule ?? []).length > 0) {
      const calcHours = (s: string, e: string) => {
        const [sh, sm] = s.slice(0,5).split(':').map(Number);
        const [eh, em] = e.slice(0,5).split(':').map(Number);
        return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      };
      const staffRows = quote.staff_schedule.map((s: any) => {
        const h = calcHours(s.start_time, s.end_time);
        const sub = Math.round(h * s.person_count * s.unit_price);
        return `<tr>
          <td style="padding:8px 12px;">${s.work_date}</td>
          <td style="padding:8px 12px;">${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)}</td>
          <td style="padding:8px 12px;text-align:center;">${s.person_count} 人</td>
          <td style="padding:8px 12px;text-align:center;">${h.toFixed(1)} h</td>
          <td style="padding:8px 12px;text-align:right;">NT$${s.unit_price.toLocaleString()}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;">NT$${sub.toLocaleString()}</td>
        </tr>`;
      }).join('');
      staffHtml = `
        <h3 style="color:#065F46;margin:20px 0 8px;">人員工時明細</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="background:#ECFDF5;color:#065F46;">
            <th style="padding:8px 12px;text-align:left;">日期</th>
            <th style="padding:8px 12px;text-align:left;">時段</th>
            <th style="padding:8px 12px;text-align:center;">人數</th>
            <th style="padding:8px 12px;text-align:center;">工時</th>
            <th style="padding:8px 12px;text-align:right;">時薪/人</th>
            <th style="padding:8px 12px;text-align:right;">小計</th>
          </tr></thead>
          <tbody>${staffRows}</tbody>
        </table>`;
    }

    // Notes HTML
    const notes = (quote.checked_notes ?? [])
      .map((n: any) => n.note)
      .filter(Boolean)
      .sort((a: any, b: any) => a.sort_order - b.sort_order);
    const notesHtml = notes.length > 0 ? `
      <h3 style="color:#374151;margin:20px 0 8px;">注意事項</h3>
      <ol style="font-size:12px;color:#6B7280;padding-left:20px;line-height:1.8;">
        ${notes.map((n: any) => `<li>${n.content}</li>`).join('')}
      </ol>` : '';

    // Discount / Total section
    const discount = quote.discount ?? 0;
    const totalHtml = discount > 0 ? `
      <div style="background:#4F46E5;color:white;border-radius:10px;padding:20px;margin:24px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.25);">
          <p style="margin:0;font-size:13px;opacity:0.75;">原價</p>
          <p style="margin:0;font-size:18px;opacity:0.6;text-decoration:line-through;">NT$${(quote.subtotal ?? quote.total).toLocaleString()}</p>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="margin:0;font-size:14px;opacity:0.85;">折扣後金額（含稅）</p>
            <p style="margin:4px 0 0;font-size:12px;opacity:0.65;">折扣 NT$${discount.toLocaleString()}</p>
          </div>
          <p style="font-size:28px;font-weight:800;margin:0;">NT$${quote.total.toLocaleString()}</p>
        </div>
      </div>` : `
      <div style="background:#4F46E5;color:white;border-radius:10px;padding:20px;display:flex;justify-content:space-between;align-items:center;margin:24px 0;">
        <div>
          <p style="margin:0;font-size:14px;opacity:0.8;">合計金額（含稅）</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.6;">以上金額均為含稅報價</p>
        </div>
        <p style="font-size:28px;font-weight:800;margin:0;">NT$${quote.total.toLocaleString()}</p>
      </div>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>步步搬家報價單</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9FAFB;margin:0;padding:20px;">
  <div style="max-width:640px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px;color:white;">
      <h1 style="margin:0 0 4px;font-size:24px;">報 價 單</h1>
      <p style="margin:0;opacity:0.8;font-size:13px;">${quote.quote_number}</p>
    </div>

    <div style="padding:32px;">
      <!-- Client -->
      <div style="background:#F8F9FF;border-radius:8px;padding:16px;margin-bottom:24px;display:flex;gap:24px;">
        <div style="flex:1;">
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;text-transform:uppercase;">客戶資訊</p>
          <p style="font-weight:700;margin:0 0 4px;">${quote.customer_name}</p>
          <p style="color:#6B7280;margin:0;font-size:14px;">${quote.phone}</p>
          ${quote.email ? `<p style="color:#6B7280;margin:0;font-size:13px;">${quote.email}</p>` : ''}
        </div>
        <div style="flex:1;">
          <p style="font-size:11px;color:#9CA3AF;margin:0 0 8px;text-transform:uppercase;">搬遷地址</p>
          ${quote.address_from ? `<p style="font-size:13px;color:#374151;margin:0 0 4px;">搬出：${quote.address_from}</p>` : ''}
          ${quote.address_to ? `<p style="font-size:13px;color:#374151;margin:0;">搬入：${quote.address_to}</p>` : ''}
        </div>
      </div>

      <!-- Items -->
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px;">
        <thead><tr style="background:#F9FAFB;">
          <th style="padding:10px 12px;text-align:left;color:#6B7280;font-size:12px;">品項</th>
          <th style="padding:10px 12px;text-align:right;color:#6B7280;font-size:12px;">單價</th>
          <th style="padding:10px 12px;text-align:center;color:#6B7280;font-size:12px;">數量</th>
          <th style="padding:10px 12px;text-align:right;color:#6B7280;font-size:12px;">小計</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      ${staffHtml}

      ${totalHtml}

      ${notesHtml}

      <!-- Footer -->
      <div style="border-top:1px solid #F0F0F0;padding-top:24px;text-align:center;margin-top:24px;">
        <p style="font-size:13px;font-weight:700;margin:0 0 4px;">步步搬家</p>
        <p style="font-size:12px;color:#9CA3AF;margin:0;">電話：02-77550920　|　地址：台北市信義區信義路五段109號1樓</p>
        <p style="font-size:12px;color:#9CA3AF;margin:8px 0 0;">感謝您選擇步步搬家</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY not set');

    // CC to admin notification emails (notify_quote = true, is_active = true)
    const { data: notifSettings } = await supabase
      .from('bubu_notification_settings')
      .select('email')
      .eq('notify_quote', true)
      .eq('is_active', true);
    const ccEmails = (notifSettings ?? [])
      .map((s: any) => s.email as string)
      .filter((e: string) => e !== quote.email);

    const emailBody: Record<string, any> = {
      from: 'steps@bubu-moving.com.tw',
      to: quote.email,
      subject: `【步步搬家】報價單 ${quote.quote_number}`,
      html,
    };
    if (ccEmails.length > 0) emailBody.cc = ccEmails;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend error: ${errBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    // Always return HTTP 200 so frontend can read the error body
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
