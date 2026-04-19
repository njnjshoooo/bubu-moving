import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Check, Link2, Unlink, AlertCircle, RefreshCw } from 'lucide-react';

interface GcalStatus {
  is_connected: boolean;
  connected_email: string | null;
  calendar_summary: string | null;
  calendar_id: string | null;
  last_synced_at: string | null;
}

export default function GoogleCalendarSettings() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<GcalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke('gcal-oauth', {
      body: { action: 'status' },
    });
    if (data?.ok) setStatus(data.config);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadStatus(); }, [isAdmin]);

  // 處理 OAuth 回呼（Google 導回 /admin/settings?gcal_code=...）
  useEffect(() => {
    const code = searchParams.get('gcal_code');
    if (!code || !isAdmin) return;
    (async () => {
      setBusy(true);
      setMsg(null);
      try {
        const { data } = await supabase.functions.invoke('gcal-oauth', {
          body: { action: 'callback', code },
        });
        if (data?.error) throw new Error(data.error);
        setMsg({ type: 'ok', text: `已連線：${data.email}（${data.calendar}）` });
        await loadStatus();
      } catch (err: any) {
        setMsg({ type: 'err', text: err.message ?? '連線失敗' });
      } finally {
        setBusy(false);
        // 清除 URL 參數
        searchParams.delete('gcal_code');
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams, isAdmin]);

  const handleConnect = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await supabase.functions.invoke('gcal-oauth', {
        body: { action: 'start' },
      });
      if (data?.error) throw new Error(data.error);
      if (data?.auth_url) window.location.href = data.auth_url;
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '取得授權連結失敗' });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('確定要解除 Google Calendar 連線嗎？')) return;
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await supabase.functions.invoke('gcal-oauth', {
        body: { action: 'disconnect' },
      });
      if (data?.error) throw new Error(data.error);
      setMsg({ type: 'ok', text: '已解除連線' });
      await loadStatus();
    } catch (err: any) {
      setMsg({ type: 'err', text: err.message ?? '解除失敗' });
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={18} className="text-brand-600" />
        <h2 className="font-semibold text-gray-800">Google Calendar 雙向同步</h2>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        連線後，所有預約會自動同步到 Google Calendar。團隊成員訂閱該 Calendar 即可即時看到預約資訊。
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : status?.is_connected ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <Check size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-800">已連線</p>
              <p className="text-green-700 text-xs mt-0.5">帳號：{status.connected_email}</p>
              <p className="text-green-700 text-xs">Calendar：{status.calendar_summary}</p>
              {status.last_synced_at && (
                <p className="text-green-600 text-xs mt-1">
                  上次同步：{new Date(status.last_synced_at).toLocaleString('zh-TW')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadStatus} disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60">
              <RefreshCw size={13} />重新整理狀態
            </button>
            <button onClick={handleDisconnect} disabled={busy}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60">
              <Unlink size={13} />解除連線
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={handleConnect} disabled={busy}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
            <Link2 size={15} />
            {busy ? '處理中...' : '連線 Google Calendar'}
          </button>
          <p className="text-xs text-gray-400 mt-2">點擊後會導向 Google 授權頁面</p>
        </div>
      )}

      {msg && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-sm flex items-start gap-2 ${
          msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {msg.type === 'err' && <AlertCircle size={15} className="mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
