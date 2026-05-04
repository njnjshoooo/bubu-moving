import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, Pause, Play, Square, Upload, AlertCircle } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../lib/useBasePath';

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

  const [title, setTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');

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

      // 建立 recording row
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
        <Link to={`${basePath}/recordings`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">新增錄音</h1>
          <p className="text-xs text-gray-500">錄音後系統會自動轉逐字稿並解析報價資訊</p>
        </div>
      </div>

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

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800">
        <p className="font-medium mb-1">💡 使用建議</p>
        <ul className="list-disc list-inside space-y-0.5 text-blue-700">
          <li>建議在安靜環境錄音，效果最佳</li>
          <li>錄音時清楚說出：客戶姓名、電話、舊家地址、新家地址、預計搬家日</li>
          <li>提到的家具、家電、特殊物品也會自動被解析</li>
          <li>錄音上傳後約 30~60 秒內完成轉錄</li>
        </ul>
      </div>
    </div>
  );
}
