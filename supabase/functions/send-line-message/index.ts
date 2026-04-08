import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { message } = await req.json();
    if (!message) throw new Error('Missing message');

    const token = Deno.env.get('LINE_CHANNEL_TOKEN');
    const target = Deno.env.get('LINE_NOTIFY_TARGET');
    if (!token) throw new Error('LINE_CHANNEL_TOKEN not set');
    if (!target) throw new Error('LINE_NOTIFY_TARGET not set');

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: target,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LINE API error: ${body}`);
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
