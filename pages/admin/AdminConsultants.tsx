import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, Phone, MapPin, Target, X } from 'lucide-react';
import { supabase, Consultant, ConsultantGoal, T } from '../../lib/supabase';

interface ConsultantWithEmail extends Consultant {
  email?: string;
}

export default function AdminConsultants() {
  const [consultants, setConsultants] = useState<ConsultantWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ display_name: '', phone: '', email: '', address: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // 月目標 Modal
  const now = new Date();
  const [goalModal, setGoalModal] = useState<Consultant | null>(null);
  const [goalForm, setGoalForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    monthly_target: 0,
  });
  const [savingGoal, setSavingGoal] = useState(false);

  const loadConsultants = async () => {
    const { data } = await supabase.from(T.consultants).select('*').order('created_at', { ascending: false });
    setConsultants((data ?? []) as ConsultantWithEmail[]);
    setLoading(false);
  };

  useEffect(() => { loadConsultants(); }, []);

  const handleAddConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      // 1. 使用 Edge Function 建立顧問帳號（需要 service_role）
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-consultant', {
        body: {
          email: addForm.email,
          display_name: addForm.display_name,
          phone: addForm.phone,
          address: addForm.address,
        },
      });
      if (fnErr) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      await loadConsultants();
      setAddForm({ display_name: '', phone: '', email: '', address: '' });
      setShowAddForm(false);
    } catch (e: any) {
      setAddError(e.message ?? '新增失敗，請稍後再試');
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (consultant: Consultant) => {
    await supabase.from(T.consultants)
      .update({ is_active: !consultant.is_active })
      .eq('id', consultant.id);
    setConsultants(prev => prev.map(c => c.id === consultant.id ? { ...c, is_active: !c.is_active } : c));
  };

  const openGoalModal = async (c: Consultant) => {
    setGoalModal(c);
    // 嘗試讀取現有目標
    const { data } = await supabase.from(T.goals)
      .select('*')
      .eq('consultant_id', c.id)
      .eq('year', goalForm.year)
      .eq('month', goalForm.month)
      .maybeSingle();
    if (data) setGoalForm({ year: data.year, month: data.month, monthly_target: data.monthly_target });
  };

  const saveGoal = async () => {
    if (!goalModal) return;
    setSavingGoal(true);
    await supabase.from(T.goals).upsert({
      consultant_id: goalModal.id,
      year: goalForm.year,
      month: goalForm.month,
      monthly_target: goalForm.monthly_target,
    }, { onConflict: 'consultant_id,year,month' });
    setSavingGoal(false);
    setGoalModal(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">顧問管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">管理所有顧問帳號與資料</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
          <Plus size={15} />新增顧問
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">新增顧問帳號</h2>
          <p className="text-xs text-gray-400 mb-4">系統將以指定 Email 建立顧問帳號，並發送設定密碼的信件。</p>
          <form onSubmit={handleAddConsultant} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
              <input value={addForm.display_name} onChange={e => setAddForm({ ...addForm, display_name: e.target.value })}
                required placeholder="王大明"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
              <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                required placeholder="consultant@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">電話</label>
              <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                placeholder="0912-345-678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">住家地址（路線規劃用）</label>
              <input value={addForm.address} onChange={e => setAddForm({ ...addForm, address: e.target.value })}
                placeholder="台北市..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              {addError && <p className="text-sm text-red-600 flex-1">{addError}</p>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(''); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all">取消</button>
                <button type="submit" disabled={adding}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
                  {adding ? '建立中...' : '建立顧問帳號'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Consultant List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : consultants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <UserCheck size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">尚無顧問，點擊「新增顧問」開始建立</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">顧問</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">聯絡資訊</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">住址</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">狀態</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {consultants.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                          {c.display_name?.[0] ?? 'C'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{c.display_name}</p>
                          <p className="text-xs text-gray-400">顧問</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
                          <Phone size={12} />{c.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {c.address ? (
                        <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                          <MapPin size={12} className="flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{c.address}</span>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? '啟用中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openGoalModal(c)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-brand-200 text-brand-600 hover:bg-brand-50 transition-all">
                          <Target size={13} />月目標
                        </button>
                        <button onClick={() => toggleActive(c)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all ${
                            c.is_active
                              ? 'text-red-500 border-red-200 hover:bg-red-50'
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`}>
                          {c.is_active ? <><UserX size={13} />停用</> : <><UserCheck size={13} />啟用</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">📝 新增顧問說明</p>
        <p>點擊「新增顧問」後，系統需要 <code className="bg-blue-100 px-1 rounded">create-consultant</code> Edge Function 來以管理員身份建立帳號。</p>
        <p className="mt-1">請確認已在 Supabase 部署此 Edge Function，並設定 <code className="bg-blue-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> 環境變數。</p>
      </div>

      {/* 月目標 Modal */}
      {goalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">設定月目標 — {goalModal.display_name}</h3>
              <button onClick={() => setGoalModal(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">年份</label>
                  <input type="number" value={goalForm.year}
                    onChange={e => setGoalForm({ ...goalForm, year: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">月份</label>
                  <select value={goalForm.month}
                    onChange={e => setGoalForm({ ...goalForm, month: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1} 月</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">月目標金額（NT$）</label>
                <input type="number" value={goalForm.monthly_target} min={0} step={10000}
                  onChange={e => setGoalForm({ ...goalForm, monthly_target: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="300000" />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setGoalModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">取消</button>
                <button onClick={saveGoal} disabled={savingGoal}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
                  {savingGoal ? '儲存中...' : '儲存目標'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
