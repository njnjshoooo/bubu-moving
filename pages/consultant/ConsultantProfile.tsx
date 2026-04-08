import React, { useEffect, useState } from 'react';
import { Save, User, Phone, MapPin } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function ConsultantProfile() {
  const { user, profile } = useAuth();
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [form, setForm] = useState({ display_name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from(T.consultants).select('id, display_name, phone, address')
      .eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setConsultantId(data.id);
          setForm({ display_name: data.display_name ?? '', phone: data.phone ?? '', address: data.address ?? '' });
        } else {
          setForm(f => ({ ...f, display_name: profile?.display_name ?? '', phone: profile?.phone ?? '' }));
        }
      });
  }, [user, profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (consultantId) {
      await supabase.from(T.consultants).update(form).eq('id', consultantId);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800">個人資料</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">顯示名稱</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                placeholder="您的姓名"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">聯絡電話</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="0912-345-678"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">住家地址（用於 Google Maps 路線規劃起點）</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="台北市..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <p className="text-xs text-gray-400 mt-1">填寫後，排程頁的「規劃路線」將以此地址為出發點</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
              <Save size={15} />{saving ? '儲存中...' : '儲存'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">已儲存！</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
