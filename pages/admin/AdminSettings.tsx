import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Bell, Mail, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase, NotificationSetting, T } from '../../lib/supabase';

export default function AdminSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addNotifyBooking, setAddNotifyBooking] = useState(true);
  const [addNotifyQuote, setAddNotifyQuote] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from(T.notificationSettings)
      .select('*')
      .order('created_at');
    setSettings(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleAdd = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    await supabase.from(T.notificationSettings).insert({
      email: addEmail.trim(),
      label: addLabel.trim() || null,
      notify_booking: addNotifyBooking,
      notify_quote: addNotifyQuote,
      is_active: true,
    });
    setAddEmail('');
    setAddLabel('');
    setAddNotifyBooking(true);
    setAddNotifyQuote(true);
    setShowAddForm(false);
    await fetchSettings();
    setAdding(false);
  };

  const handleToggleActive = async (setting: NotificationSetting) => {
    await supabase.from(T.notificationSettings)
      .update({ is_active: !setting.is_active })
      .eq('id', setting.id);
    await fetchSettings();
  };

  const handleToggleBooking = async (setting: NotificationSetting) => {
    await supabase.from(T.notificationSettings)
      .update({ notify_booking: !setting.notify_booking })
      .eq('id', setting.id);
    await fetchSettings();
  };

  const handleToggleQuote = async (setting: NotificationSetting) => {
    await supabase.from(T.notificationSettings)
      .update({ notify_quote: !setting.notify_quote })
      .eq('id', setting.id);
    await fetchSettings();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除此通知信箱嗎？')) return;
    await supabase.from(T.notificationSettings).delete().eq('id', id);
    await fetchSettings();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">系統設定</h1>
        <p className="text-sm text-gray-500 mt-1">管理後台通知與系統參數</p>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-brand-500" />
            <div>
              <h2 className="font-semibold text-gray-800">系統通知信箱</h2>
              <p className="text-xs text-gray-400 mt-0.5">當客戶預約或顧問寄送報價單時，這些信箱將收到副本通知</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-all">
            <Plus size={14} />新增信箱
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="px-5 py-4 bg-brand-50 border-b border-brand-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">新增通知信箱</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="example@company.com"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">備註名稱（選填）</label>
                <input
                  value={addLabel}
                  onChange={e => setAddLabel(e.target.value)}
                  placeholder="例：業務主管信箱"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addNotifyBooking} onChange={e => setAddNotifyBooking(e.target.checked)}
                  className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700">接收預約通知</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addNotifyQuote} onChange={e => setAddNotifyQuote(e.target.checked)}
                  className="w-4 h-4 accent-brand-500" />
                <span className="text-sm text-gray-700">接收報價通知</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={adding || !addEmail.trim()}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
                {adding ? '新增中...' : '確認新增'}
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-xl transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center">
            <Mail size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">尚未設定通知信箱</p>
            <p className="text-xs text-gray-300 mt-1">點擊「新增信箱」開始設定</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {settings.map(setting => (
              <div key={setting.id} className={`px-5 py-4 flex items-center gap-4 ${!setting.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 text-sm">{setting.email}</p>
                    {setting.label && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{setting.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs ${setting.notify_booking ? 'text-brand-600' : 'text-gray-400'}`}>
                      📅 預約通知
                    </span>
                    <span className={`text-xs ${setting.notify_quote ? 'text-brand-600' : 'text-gray-400'}`}>
                      📄 報價通知
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Toggle booking */}
                  <button onClick={() => handleToggleBooking(setting)} title="預約通知"
                    className={`p-1.5 rounded-lg transition-colors text-xs ${setting.notify_booking ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    📅
                  </button>
                  {/* Toggle quote */}
                  <button onClick={() => handleToggleQuote(setting)} title="報價通知"
                    className={`p-1.5 rounded-lg transition-colors text-xs ${setting.notify_quote ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                    📄
                  </button>
                  {/* Toggle active */}
                  <button onClick={() => handleToggleActive(setting)} title={setting.is_active ? '停用' : '啟用'}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    {setting.is_active
                      ? <ToggleRight size={20} className="text-green-500" />
                      : <ToggleLeft size={20} className="text-gray-400" />}
                  </button>
                  {/* Delete */}
                  <button onClick={() => handleDelete(setting.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={15} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Settings size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-1">說明</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• <strong>預約通知</strong>：客戶在官網完成預約、修改或取消時，信箱會收到副本</li>
              <li>• <strong>報價通知</strong>：顧問點擊「發送給客戶」時，信箱會收到報價單副本</li>
              <li>• 停用的信箱不會收到通知，但不會刪除設定</li>
              <li>• 此功能需要 Resend API 金鑰已正確設定於 Edge Function 環境變數</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
