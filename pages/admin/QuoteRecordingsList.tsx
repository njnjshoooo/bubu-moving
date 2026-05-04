import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Mic, Phone, Calendar, FileText, AlertCircle, Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase, QuoteRecording, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBasePath } from '../../lib/useBasePath';

const statusLabel: Record<QuoteRecording['status'], { text: string; color: string }> = {
  recording:    { text: '錄音中',     color: 'bg-red-100 text-red-700' },
  uploaded:     { text: '已上傳',     color: 'bg-blue-100 text-blue-700' },
  transcribing: { text: '轉錄中...',  color: 'bg-yellow-100 text-yellow-700' },
  transcribed:  { text: '已轉錄',     color: 'bg-blue-100 text-blue-700' },
  extracting:   { text: 'AI 解析中', color: 'bg-yellow-100 text-yellow-700' },
  done:         { text: '完成',       color: 'bg-green-100 text-green-700' },
  failed:       { text: '失敗',       color: 'bg-gray-100 text-gray-500' },
  converted:    { text: '已建立報價', color: 'bg-purple-100 text-purple-700' },
};

const statusIcon = (status: QuoteRecording['status']) => {
  if (status === 'transcribing' || status === 'extracting') return <Loader2 size={11} className="animate-spin" />;
  if (status === 'failed') return <AlertCircle size={11} />;
  if (status === 'converted') return <CheckCircle2 size={11} />;
  return null;
};

function formatDuration(sec: number | null): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QuoteRecordingsList() {
  const { isAdmin } = useAuth();
  const basePath = useBasePath();
  const [recordings, setRecordings] = useState<QuoteRecording[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(T.quoteRecordings)
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    setRecordings((data ?? []) as QuoteRecording[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const archive = async (id: string, title: string) => {
    if (!confirm(`確定封存「${title || '此錄音'}」嗎？\n封存後不會出現在列表，但音檔仍保留在伺服器。`)) return;
    await supabase.from(T.quoteRecordings)
      .update({ archived_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">報價錄音</h1>
          <p className="text-sm text-gray-500 mt-1">錄製顧問與客戶的對話，自動轉成逐字稿與報價資訊。</p>
        </div>
        <Link to={`${basePath}/recordings/new`}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
          <Mic size={15} />開始錄音
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <Link to={`${basePath}/quotes`}
          className="px-4 py-2 text-sm font-medium rounded-lg text-gray-500 hover:text-gray-700">
          報價單
        </Link>
        <span className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-800 shadow-sm">
          報價錄音
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : recordings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Mic size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 mb-4">尚無錄音記錄</p>
          <Link to={`${basePath}/recordings/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl">
            <Mic size={15} />建立第一筆錄音
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['標題 / 客戶', '時長', '狀態', '建立時間', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recordings.map(r => {
                  const st = statusLabel[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{r.title || '（未命名錄音）'}</p>
                        {r.customer_name && (
                          <p className="text-xs text-gray-400 mt-0.5">{r.customer_name}{r.phone ? ` ・ ${r.phone}` : ''}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{formatDuration(r.audio_duration_sec)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                          {statusIcon(r.status)}
                          {st.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('zh-TW', { hour12: false })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link to={`${basePath}/recordings/${r.id}`}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg">
                            開啟
                          </Link>
                          {r.quote_id && (
                            <Link to={`${basePath}/quotes/${r.quote_id}`}
                              className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg">
                              <FileText size={12} />報價單
                            </Link>
                          )}
                          {isAdmin && (
                            <button onClick={() => archive(r.id, r.title)}
                              className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-lg"
                              title="封存（admin）">
                              <Trash2 size={12} />封存
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
