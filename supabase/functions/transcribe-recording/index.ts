// 從 Supabase Storage 讀取錄音檔 → Groq Whisper 轉錄 → Groq Llama 解析報價資訊
// 需要環境變數：GROQ_API_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ok = (body: any, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

// 解析 JSON 結果的 prompt
const CURRENT_YEAR = new Date().getFullYear();
const EXTRACT_SYSTEM_PROMPT = `你是搬家公司的助理。請從顧問與客戶的通話逐字稿中，解析出以下資訊並以 JSON 格式回傳。

當前年份是 ${CURRENT_YEAR}，若客戶說「5/20」「5月20日」這類沒寫年份的日期，請使用 ${CURRENT_YEAR}（若已過則用 ${CURRENT_YEAR + 1}）。

只回傳純 JSON（不要包 markdown code block），格式如下：
{
  "customer_name": "客戶姓名（沒提到留 null）",
  "phone": "電話（沒提到留 null）",
  "email": "Email（沒提到留 null）",
  "address_from": "舊址（盡量完整縣市區地址 + 樓層）",
  "address_to": "新址",
  "address_from_type": "公寓 / 大樓 / 透天 / 別墅 / 工廠 / 其他（沒提到留 null）",
  "address_from_parking": "停車或臨停描述，例：路邊臨停 / 地下室停車場 / 巷弄無法停車（沒提到留 null）",
  "address_from_basement": "地下室狀況，例：B1 高度 2.2M / 無地下室 / B2 限高 2M（沒提到留 null）",
  "address_from_guard": "管理室狀況，例：24小時警衛 / 無管理 / 需先通報（沒提到留 null）",
  "address_to_type": "新址同上分類",
  "address_to_parking": "新址停車狀況",
  "address_to_basement": "新址地下室狀況",
  "address_to_guard": "新址管理室狀況",
  "moving_date": "YYYY-MM-DD 預計搬家日（沒提到留 null）",
  "arrival_time": "HH:MM 24 小時制（搬家公司預計到場時間，沒提到留 null）",
  "family_adults": 數字（家中大人，沒提到留 null）,
  "family_kids": 數字（小孩）,
  "family_pets": 數字（寵物）,
  "old_elevator": "none / has / freight（無/有電梯/有貨梯，沒提到留 null）",
  "new_elevator": "none / has / freight",
  "large_furniture": [{"name": "家具名", "qty": 數量}],
  "large_appliances": [{"name": "家電名", "qty": 數量}],
  "service_packing": true/false（客戶是否需要打包服務）,
  "service_moving": true/false（是否需要搬運）,
  "service_unpacking": true/false（是否需要拆箱上架）,
  "service_screening": true/false（是否需要打包前篩選/斷捨離）,
  "notes": ["注意事項1", "注意事項2", ...]（陣列，每項一句話，列出客戶提到的特殊狀況）,
  "schedule_items": [
    {"work_date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM 或 null", "label": "作業名稱"}
  ]
}

務必：
- 沒提到的欄位用 null（不要編造）
- 數字欄位用數字（不要字串）
- 地址盡量完整（縣市+區+路名+門牌+樓層）

⭐ schedule_items 是非常重要的欄位，請務必認真抓取！

判斷原則：
- 只要逐字稿中出現「日期 + 時間 + 動作 / 作業」的組合，就**必抓進來**
- 動作 / 作業 = 搬家相關的動詞或名詞（不限以下範例，只要是搬家事務都算）
- 時間表達可能是「10點」「10:00」「上午十點」「10時」「下午1點」「13:00」⋯⋯，全都要轉成 24 小時制 HH:MM
- 日期表達可能是「5/20」「5月20日」「五月二十號」「下週三」「明天」⋯⋯
  - 「5/20」→ ${CURRENT_YEAR}-05-20（若已過則 ${CURRENT_YEAR + 1}）
  - 「明天」「下週」用相對時間自行推算（搭配當前年份）
- 端時間：
  - 講了結束時間就填，例：「11 點到 13 點打包」→ end_time:"13:00"
  - 沒講結束時間就 end_time 設為 start_time（或 null）

範例：
逐字稿片段「5/20 早上 10 點要過來清運，11 點開始打包到下午 1 點，下午 2 點搬家公司會到，4 點開始上架」
→ schedule_items:
[
  {"work_date": "${CURRENT_YEAR}-05-20", "start_time": "10:00", "end_time": "10:00", "label": "清運"},
  {"work_date": "${CURRENT_YEAR}-05-20", "start_time": "11:00", "end_time": "13:00", "label": "打包"},
  {"work_date": "${CURRENT_YEAR}-05-20", "start_time": "14:00", "end_time": "14:00", "label": "搬家公司抵達"},
  {"work_date": "${CURRENT_YEAR}-05-20", "start_time": "16:00", "end_time": "16:00", "label": "新家上架"}
]

label 直接用客戶說的動作（如：「清運」「打包」「上架」「搬家公司抵達」「包材送達」「收尾」⋯）
排序：請按日期 + 開始時間 由早到晚排列
若整段沒提到任何時段：schedule_items: []

notes 是陣列，每項一句短話。包含：
  • 特殊物品（鋼琴、保險箱、藝術品...）
  • 易碎品提醒
  • 樓層 / 電梯尺寸限制
  • 寵物注意事項
  • 兒童在場
  • 客戶特別交代（時間、停車、進出限制、社區管理規則...）`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let recordingId: string | undefined;
  let supabase: any;

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';

    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY 未設定');

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    recordingId = body.recording_id;
    if (!recordingId) throw new Error('缺少 recording_id');

    // 取得 recording
    const { data: rec, error: recErr } = await supabase.from('bubu_quote_recordings')
      .select('*').eq('id', recordingId).maybeSingle();
    if (recErr || !rec) throw new Error('找不到錄音');
    if (!rec.audio_url) throw new Error('音檔路徑為空');

    // ── 1. 從 Storage 下載音檔 ───────────────────────────────────────────
    await supabase.from('bubu_quote_recordings')
      .update({ status: 'transcribing', error_message: null }).eq('id', recordingId);

    const { data: fileData, error: dlErr } = await supabase.storage
      .from('quote-recordings').download(rec.audio_url);
    if (dlErr || !fileData) throw new Error(`下載音檔失敗：${dlErr?.message ?? 'unknown'}`);

    // ── 2. 呼叫 Groq Whisper 轉錄 ────────────────────────────────────────
    const formData = new FormData();
    const filename = rec.audio_url.split('/').pop() ?? 'audio.webm';
    formData.append('file', fileData, filename);
    formData.append('model', 'whisper-large-v3');
    formData.append('language', 'zh');
    formData.append('response_format', 'verbose_json');
    // 提示文字：用繁體字樣偏好 + 搬家相關詞彙，引導 Whisper 輸出繁體中文
    formData.append('prompt',
      '以下是台灣搬家公司顧問與客戶的繁體中文對話。請使用繁體中文輸出。' +
      '常見詞彙：顧問、客戶、舊家、新家、地址、台北市、新北市、預計搬家日、' +
      '電梯、貨梯、卸貨區、地下室、管理室、警衛、打包、上架、清運、車趟、' +
      '包材、紙箱、易碎品、鋼琴、衣櫃、沙發、冰箱、洗衣機。'
    );

    const transcribeRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });
    if (!transcribeRes.ok) {
      const errText = await transcribeRes.text();
      throw new Error(`Whisper 轉錄失敗：${errText}`);
    }
    const transcribeData = await transcribeRes.json();
    const transcript = transcribeData.text ?? '';
    const segments = (transcribeData.segments ?? []).map((s: any) => ({
      start: s.start, end: s.end, text: s.text,
    }));

    await supabase.from('bubu_quote_recordings').update({
      status: 'extracting', transcript, transcript_segments: segments,
    }).eq('id', recordingId);

    // ── 3. 呼叫 Groq Llama 解析逐字稿 → 結構化 JSON ───────────────────────
    const chatRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: `逐字稿：\n\n${transcript}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });
    if (!chatRes.ok) {
      const errText = await chatRes.text();
      throw new Error(`AI 解析失敗：${errText}`);
    }
    const chatData = await chatRes.json();
    const content = chatData.choices?.[0]?.message?.content ?? '{}';

    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch {
      // 若回傳不是純 JSON，嘗試從 markdown code block 抽取
      const m = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      extractedData = m ? JSON.parse(m[1]) : {};
    }

    // ── 4. 寫回 DB ─────────────────────────────────────────────────────────
    await supabase.from('bubu_quote_recordings').update({
      status: 'done',
      extracted_data: extractedData,
    }).eq('id', recordingId);

    return ok({ ok: true, transcript_length: transcript.length });
  } catch (err: any) {
    console.error('transcribe-recording error:', err);
    if (recordingId && supabase) {
      await supabase.from('bubu_quote_recordings').update({
        status: 'failed',
        error_message: err.message ?? String(err),
      }).eq('id', recordingId);
    }
    return ok({ ok: false, error: err.message ?? '處理失敗' });
  }
});
