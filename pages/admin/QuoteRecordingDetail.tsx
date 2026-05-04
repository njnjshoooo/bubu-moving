import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Loader2, RefreshCw, AlertCircle, CheckCircle2, Wand2 } from 'lucide-react';
import { supabase, QuoteRecording, ExtractedQuoteData, T } from '../../lib/supabase';
import { useBasePath } from '../../lib/useBasePath';

export default function QuoteRecordingDetail() {
  const { recordingId } = useParams();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [rec, setRec] = useState<QuoteRecording | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    if (!recordingId) return;
    setLoading(true);
    const { data } = await supabase.from(T.quoteRecordings)
      .select('*').eq('id', recordingId).maybeSingle();
    setRec(data as QuoteRecording | null);
    if (data?.audio_url) {
      // 取得 signed URL（私有 bucket）
      const { data: urlData } = await supabase.storage.from('quote-recordings')
        .createSignedUrl(data.audio_url, 3600);
      setAudioUrl(urlData?.signedUrl ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // 若狀態為處理中，每 5 秒輪詢一次
    const id = setInterval(() => {
      setRec(prev => {
        if (prev && ['uploaded', 'transcribing', 'extracting'].includes(prev.status)) {
          load();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const retryTranscribe = async () => {
    if (!rec) return;
    setBusy(true);
    setMsg(null);
    try {
      await supabase.from(T.quoteRecordings)
        .update({ status: 'uploaded', error_message: null }).eq('id', rec.id);
      const { data, error } = await supabase.functions.invoke('transcribe-recording', {
        body: { recording_id: rec.id },
      });
      if (error && !data) throw error;
      if (data?.error) throw new Error(data.error);
      await load();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '重試失敗' });
    } finally {
      setBusy(false);
    }
  };

  const convertToQuote = async () => {
    if (!rec || !rec.extracted_data) return;
    if (!confirm('要把此錄音解析的資料建立為新報價單嗎？\n（建立後可在報價單頁面繼續編輯）')) return;
    setBusy(true);
    setMsg(null);
    try {
      const ext = rec.extracted_data;
      // 產生報價單號
      const ts = new Date();
      const quoteNumber = `Q${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}`;

      const { data: q, error } = await supabase.from(T.quotes).insert({
        quote_number: quoteNumber,
        customer_name: ext.customer_name ?? rec.customer_name ?? '',
        phone: ext.phone ?? rec.phone ?? '',
        email: ext.email ?? null,
        address_from: ext.address_from ?? null,
        address_to: ext.address_to ?? null,
        subtotal: 0, total: 0, deposit: 0, status: '草稿',
        consultant_id: rec.consultant_id,
      }).select('id').single();
      if (error) throw error;

      // 若有解析出 booking 相關資訊（搬家日），建立計劃書 estimation 預填
      if (ext.moving_date || ext.arrival_time || ext.large_furniture || ext.notes) {
        await supabase.from(T.movingPlans).insert({
          quote_id: q.id,
          estimation: {
            expected_moving_date: ext.moving_date,
            arrival_time: ext.arrival_time,
            old_elevator: ext.old_elevator,
            new_elevator: ext.new_elevator,
            family_adults: ext.family_adults,
            family_kids: ext.family_kids,
            family_pets: ext.family_pets,
            large_furniture: ext.large_furniture?.map(f => ({ ...f, need_disassembly: false })),
            large_appliances: ext.large_appliances,
            service_packing: ext.service_packing,
            service_moving: ext.service_moving,
            service_unpacking: ext.service_unpacking,
            service_screening: ext.service_screening,
            notes: ext.notes,
            supplies: {},
          },
          execution: {}, review: {}, status: 'draft',
        });
      }

      // 標記錄音已轉成報價單
      await supabase.from(T.quoteRecordings)
        .update({ status: 'converted', quote_id: q.id, converted_at: new Date().toISOString() })
        .eq('id', rec.id);

      navigate(`${basePath}/quotes/${q.id}`);
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '建立失敗' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-brand-500" />
    </div>;
  }

  if (!rec) {
    return <div className="text-center text-gray-400 py-12">找不到錄音</div>;
  }

  const ext = rec.extracted_data;
  const isProcessing = ['uploaded', 'transcribing', 'extracting'].includes(rec.status);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`${basePath}/recordings`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800 truncate">{rec.title || '（未命名錄音）'}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(rec.created_at).toLocaleString('zh-TW')}
            {rec.audio_duration_sec ? ` ・ 時長 ${Math.floor(rec.audio_duration_sec/60)}:${String(rec.audio_duration_sec%60).padStart(2,'0')}` : ''}
          </p>
        </div>
        {ext && rec.status !== 'converted' && (
          <button onClick={convertToQuote} disabled={busy}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
            <Wand2 size={15} />轉成報價單
          </button>
        )}
        {rec.quote_id && (
          <Link to={`${basePath}/quotes/${rec.quote_id}`}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-sm rounded-xl">
            <FileText size={15} />已建立的報價單
          </Link>
        )}
      </div>

      {/* 狀態提示 */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-blue-600" />
          <div className="flex-1">
            <p className="font-medium text-blue-800">
              {rec.status === 'uploaded' && '等待開始轉錄...'}
              {rec.status === 'transcribing' && '正在轉錄逐字稿...（約 30~60 秒）'}
              {rec.status === 'extracting' && '正在用 AI 解析報價資訊...'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">本頁面會自動更新，請稍候</p>
          </div>
        </div>
      )}

      {rec.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">處理失敗</p>
            <p className="text-sm text-red-700 mt-0.5">{rec.error_message || '未知錯誤'}</p>
            <button onClick={retryTranscribe} disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg">
              <RefreshCw size={13} />重試
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* 音檔播放器 */}
      {audioUrl && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">🎙 錄音檔</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {/* 解析結果 */}
      {ext && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-gray-800">🤖 AI 解析結果</p>
            {rec.status === 'converted' && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                <CheckCircle2 size={12} />已建立報價單
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="客戶姓名" value={ext.customer_name} />
            <Row label="電話" value={ext.phone} />
            <Row label="Email" value={ext.email} />
            <Row label="預計搬家日" value={ext.moving_date} />
            <Row label="進場時間" value={ext.arrival_time} />
            <Row label="家中成員" value={
              [ext.family_adults && `大人 ${ext.family_adults}`,
               ext.family_kids && `小孩 ${ext.family_kids}`,
               ext.family_pets && `寵物 ${ext.family_pets}`].filter(Boolean).join('、')
            } />
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <Row label="舊址" value={ext.address_from} />
            <Row label="新址" value={ext.address_to} />
          </div>
          {ext.large_furniture && ext.large_furniture.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">大型家具：</p>
              <p className="text-sm">{ext.large_furniture.map(f => `${f.name}×${f.qty}`).join('、')}</p>
            </div>
          )}
          {ext.large_appliances && ext.large_appliances.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">大型家電：</p>
              <p className="text-sm">{ext.large_appliances.map(a => `${a.name}×${a.qty}`).join('、')}</p>
            </div>
          )}
          {ext.notes && (
            <div className="mt-3 bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
              <p className="font-semibold text-yellow-800 mb-1">📌 注意事項</p>
              <p className="text-yellow-900 whitespace-pre-wrap">{ext.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* 逐字稿 */}
      {rec.transcript && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-3">📝 逐字稿</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{rec.transcript}</p>
        </div>
      )}
    </div>
  );
}

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-2">
    <span className="text-gray-500 shrink-0 w-20">{label}：</span>
    <span className="text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</span>
  </div>
);
