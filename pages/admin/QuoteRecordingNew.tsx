import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Pause, Play, Square, Upload, AlertCircle, FileText } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../lib/useBasePath';

// 提示顧問要跟客戶確認的項目（分類）
const CHECKLIST_GROUPS = [
  {
    title: '👤 客戶基本資料',
    items: ['姓名', '電話', 'Email（選填）', '是否為決策者'],
  },
  {
    title: '📍 舊家環境',
    items: [
      '完整地址（縣市、區、路名、門牌、樓層）',
      '電梯：無 / 一般電梯 / 貨梯',
      '電梯尺寸（公分）— 尤其大型家具能否進',
      '卸貨區位置：地下室 / 路邊 / 巷弄',
      '從車輛到電梯的步行距離（>30M 加費）',
      '社區是否需要管理室通報 / 准入時段',
    ],
  },
  {
    title: '🏠 新家環境',
    items: [
      '完整地址（含樓層）',
      '電梯：無 / 一般 / 貨梯 + 尺寸',
      '卸貨區位置與步行距離',
      '是否還在裝潢 / 有無人員協助',
      '社區停車限制、進出時段、需通報',
    ],
  },
  {
    title: '📅 時程與服務',
    items: [
      '預計搬家日（日期）',
      '搬家公司預計幾點到場',
      '當天是否會入住（影響打包優先度）',
      '需要哪些服務：打包 / 搬運 / 拆箱上架 / 斷捨離',
    ],
  },
  {
    title: '👨‍👩‍👧 家庭狀況',
    items: ['大人 / 小孩 / 寵物 數量', '有無年長者、嬰幼兒（避開時段）'],
  },
  {
    title: '📦 大型物品',
    items: [
      '床（單/雙/Queen/King）、衣櫃、沙發、餐桌',
      '冰箱、洗衣機、烘衣機、除濕機、冷氣',
      '鋼琴、保險箱、藝術品、骨董',
      '是否需要拆裝',
      '易碎品（玻璃、陶瓷、樂器、3C）',
    ],
  },
];

type RecState = 'idle' | 'recording' | 'paused' | 'stopped' | 'uploading';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function QuoteRecordingNew() {
  const { profile } = useAuth();
  const basePath = useBasePath();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedQuoteId = searchParams.get('quoteId');

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedQuoteInfo, setLinkedQuoteInfo] = useState<{ quote_number: string; customer_name: string } | null>(null);

  // 若帶 quoteId，載入報價單資訊並預填客戶資料
  useEffect(() => {
    if (!linkedQuoteId) return;
    supabase.from(T.quotes).select('quote_number, customer_name, phone')
      .eq('id', linkedQuoteId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setLinkedQuoteInfo({ quote_number: data.quote_number, customer_name: data.customer_name });
          setCustomerName(data.customer_name ?? '');
          setPhone(data.phone ?? '');
          setTitle(`${data.customer_name ?? '客戶'} ・ 補充錄音 ・ ${new Date().toLocaleDateString('zh-TW')}`);
        }
      });
  }, [linkedQuoteId]);

  const [state, setState] = useState<RecState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = () => {
    timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 偵測支援的格式（手機 Safari 用 mp4，其他用 webm）
      const mimeOptions = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = mimeOptions.find(m => MediaRecorder.isTypeSupported(m)) ?? '';
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mr.start(1000); // 每秒切一個 chunk
      setState('recording');
      setSeconds(0);
      startTimer();
    } catch (err: any) {
      setError(err.message ?? '無法存取麥克風（請確認瀏覽器權限）');
    }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    stopTimer();
    setState('paused');
  };
  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    startTimer();
    setState('recording');
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    stopTimer();
    setState('stopped');
  };
  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setState('idle');
    setSeconds(0);
  };

  const upload = async () => {
    if (!audioBlob) return;
    setError('');
    setState('uploading');
    try {
      const ext = audioBlob.type.includes('mp4') ? 'm4a'
        : audioBlob.type.includes('ogg') ? 'ogg'
        : 'webm';
      const ts = Date.now();
      const path = `recordings/${profile?.id ?? 'anon'}/${ts}.${ext}`;

      const { error: upErr } = await supabase.storage.from('quote-recordings')
        .upload(path, audioBlob, { contentType: audioBlob.type, upsert: false });
      if (upErr) throw upErr;

      // 取得 consultant id（若是顧問）
      let consultantId: string | null = null;
      if (profile?.role === 'consultant') {
        const { data: c } = await supabase.from(T.consultants)
          .select('id').eq('user_id', profile.id).maybeSingle();
        consultantId = c?.id ?? null;
      }

      // 建立 recording row（若帶 quoteId 直接綁定）
      const { data: rec, error: insErr } = await supabase.from(T.quoteRecordings).insert({
        created_by_user_id: profile?.id,
        consultant_id: consultantId,
        title: title.trim() || `${customerName || '未命名'} ・ ${new Date().toLocaleString('zh-TW')}`,
        customer_name: customerName.trim() || null,
        phone: phone.trim() || null,
        audio_url: path,
        audio_duration_sec: seconds,
        audio_size_bytes: audioBlob.size,
        status: 'uploaded',
        quote_id: linkedQuoteId || null,
      }).select('id').single();
      if (insErr) throw insErr;

      // 觸發轉錄（背景執行，不等回應）
      supabase.functions.invoke('transcribe-recording', {
        body: { recording_id: rec.id },
      }).catch(() => { /* 失敗時頁面內手動重試 */ });

      // 跳轉到詳情頁
      navigate(`${basePath}/recordings/${rec.id}`);
    } catch (err: any) {
      setError(err.message ?? '上傳失敗');
      setState('stopped');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to={linkedQuoteId ? `${basePath}/quotes/${linkedQuoteId}` : `${basePath}/recordings`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">{linkedQuoteId ? '補充錄音' : '新增錄音'}</h1>
          <p className="text-xs text-gray-500">錄音後系統會自動轉逐字稿並解析報價資訊</p>
        </div>
      </div>

      {/* 連結報價單提示 */}
      {linkedQuoteInfo && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <FileText size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-purple-800 text-sm">補充到報價單 {linkedQuoteInfo.quote_number}</p>
            <p className="text-xs text-purple-700 mt-0.5">客戶：{linkedQuoteInfo.customer_name}・上傳後解析結果會追加至此報價單</p>
          </div>
        </div>
      )}

      {/* 基本資料 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700">基本資料（選填，方便後續查找）</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">客戶姓名</label>
            <input value={customerName} onChange={e => setCustomerName(e.target.value)}
              placeholder="王小明" disabled={state !== 'idle'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:bg-gray-50" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">電話</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0912345678" disabled={state !== 'idle'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:bg-gray-50" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">標題（不填則自動產生）</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="王小明・到府估價・2026/05/01" disabled={state !== 'idle'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:bg-gray-50" />
          </div>
        </div>
      </div>

      {/* 錄音控制 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8">
        <div className="text-center">
          {/* 計時器 */}
          <div className="text-6xl font-mono font-bold text-gray-800 mb-6 tabular-nums">
            {formatTime(seconds)}
          </div>

          {/* 狀態指示 */}
          <div className="mb-6 h-6">
            {state === 'recording' && (
              <span className="inline-flex items-center gap-2 text-red-600 text-sm font-medium">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                錄音中
              </span>
            )}
            {state === 'paused' && <span className="text-yellow-600 text-sm">已暫停</span>}
            {state === 'stopped' && <span className="text-green-600 text-sm">錄音完成，可預覽或上傳</span>}
            {state === 'uploading' && <span className="text-blue-600 text-sm">上傳中...</span>}
          </div>

          {/* 預覽播放器 */}
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full mb-6" />
          )}

          {/* 控制按鈕 */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {state === 'idle' && (
              <button onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-base font-medium shadow-md">
                <Mic size={20} />開始錄音
              </button>
            )}
            {state === 'recording' && (
              <>
                <button onClick={pauseRecording}
                  className="flex items-center gap-2 px-5 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-sm">
                  <Pause size={18} />暫停
                </button>
                <button onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm">
                  <Square size={18} />停止
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button onClick={resumeRecording}
                  className="flex items-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm">
                  <Play size={18} />繼續錄音
                </button>
                <button onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm">
                  <Square size={18} />停止
                </button>
              </>
            )}
            {state === 'stopped' && (
              <>
                <button onClick={reset}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm">
                  <MicOff size={18} />重新錄音
                </button>
                <button onClick={upload}
                  className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-base font-medium shadow-md">
                  <Upload size={20} />上傳並開始轉錄
                </button>
              </>
            )}
            {state === 'uploading' && (
              <button disabled
                className="flex items-center gap-2 px-6 py-3 bg-brand-300 text-white rounded-xl text-base">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                上傳中...
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 確認清單：顧問通話時要逐項確認 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="font-bold text-gray-800 mb-1">📋 通話確認清單</p>
        <p className="text-xs text-gray-500 mb-4">提示：以下項目請於通話中逐項確認，事後 AI 才能準確解析。</p>
        <div className="space-y-4">
          {CHECKLIST_GROUPS.map((g, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-700 mb-1.5">{g.title}</p>
              <ul className="text-xs text-gray-600 space-y-1 pl-4">
                {g.items.map((item, j) => (
                  <li key={j} className="list-disc">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-medium mb-1">💡 使用建議</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>建議在安靜環境錄音，效果最佳</li>
          <li>錄音時請依「通話確認清單」逐項詢問</li>
          <li>錄音上傳後約 30~60 秒內完成轉錄</li>
        </ul>
      </div>
    </div>
  );
}
