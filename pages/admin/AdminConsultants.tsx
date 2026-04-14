import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, Phone, MapPin, Target, X, Shield, UserCog, AlertCircle } from 'lucide-react';
import { supabase, Consultant, ConsultantGoal, AppUser, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TAIWAN_DISTRICTS, CITIES } from '../../lib/taiwanDistricts';

interface ConsultantWithEmail extends Consultant {
  email?: string;
}

interface AdminUserRow extends AppUser {
  email?: string;
}

// ─── Address parse helper ──────────────────────────────────────────────────
function parseAddress(addr: string): { city: string; district: string; detail: string } {
  if (!addr) return { city: '', district: '', detail: '' };
  for (const city of CITIES) {
    if (addr.startsWith(city)) {
      const rest = addr.slice(city.length);
      for (const district of TAIWAN_DISTRICTS[city] ?? []) {
        if (rest.startsWith(district)) {
          return { city, district, detail: rest.slice(district.length) };
        }
      }
      return { city, district: '', detail: rest };
    }
  }
  return { city: '', district: '', detail: addr };
}

const roleLabel: Record<string, string> = {
  admin:   '最高管理者',
  manager: '管理員',
};
const roleBadge: Record<string, string> = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
};

type TabType = 'consultants' | 'admins';

export default function AdminConsultants() {
  const { profile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('consultants');

  // ── Consultant tab state ────────────────────────────────────────────────
  const [consultants, setConsultants] = useState<ConsultantWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ display_name: '', phone: '', email: '' });
  // Address parts for new consultant form
  const [addAddrCity, setAddAddrCity] = useState('');
  const [addAddrDistrict, setAddAddrDistrict] = useState('');
  const [addAddrDetail, setAddAddrDetail] = useState('');
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

  // ── Admin users tab state ───────────────────────────────────────────────
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminForm, setAdminForm] = useState({ display_name: '', email: '', role: 'manager' as 'admin' | 'manager' });
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminAddError, setAdminAddError] = useState('');
  const [adminAddOk, setAdminAddOk] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  const loadConsultants = async () => {
    const { data } = await supabase.from(T.consultants).select('*').order('created_at', { ascending: false });
    setConsultants((data ?? []) as ConsultantWithEmail[]);
    setLoading(false);
  };

  const loadAdminUsers = async () => {
    setAdminLoading(true);
    const { data } = await supabase
      .from(T.users)
      .select('*')
      .in('role', ['admin', 'manager'])
      .order('created_at', { ascending: false });
    setAdminUsers((data as AdminUserRow[]) ?? []);
    setAdminLoading(false);
  };

  useEffect(() => { loadConsultants(); }, []);

  useEffect(() => {
    if (activeTab === 'admins' && isAdmin) {
      loadAdminUsers();
    }
  }, [activeTab, isAdmin]);

  // ── Consultant actions ────────────────────────────────────────────────────
  const handleAddConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const address = [addAddrCity, addAddrDistrict, addAddrDetail].filter(Boolean).join('');
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-consultant', {
        body: {
          email: addForm.email,
          display_name: addForm.display_name,
          phone: addForm.phone,
          address: address || null,
        },
      });
      if (fnErr && !fnData) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      await loadConsultants();
      setAddForm({ display_name: '', phone: '', email: '' });
      setAddAddrCity(''); setAddAddrDistrict(''); setAddAddrDetail('');
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

  // ── Admin user actions ────────────────────────────────────────────────────
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAdmin(true);
    setAdminAddError('');
    setAdminAddOk(false);
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-admin', {
        body: {
          email: adminForm.email,
          display_name: adminForm.display_name,
          role: adminForm.role,
        },
      });
      if (fnErr && !fnData) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      setAdminAddOk(true);
      setAdminForm({ display_name: '', email: '', role: 'manager' });
      await loadAdminUsers();
      setTimeout(() => { setShowAdminForm(false); setAdminAddOk(false); }, 1500);
    } catch (err: any) {
      setAdminAddError(err.message ?? '新增失敗，請稍後再試');
    } finally {
      setAddingAdmin(false);
    }
  };

  const updateAdminRole = async (userId: string, newRole: 'admin' | 'manager') => {
    if (userId === profile?.id) return;
    await supabase.from(T.users).update({ role: newRole }).eq('id', userId);
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">帳號管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">管理顧問帳號與管理員帳號</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('consultants')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'consultants' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          估價顧問
        </button>
        {isAdmin && (
          <button onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'admins' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            管理員帳號
          </button>
        )}
      </div>

      {/* ── 估價顧問 tab ── */}
      {activeTab === 'consultants' && (
        <>
          <div className="flex justify-end">
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
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="relative">
                      <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select value={addAddrCity}
                        onChange={e => { setAddAddrCity(e.target.value); setAddAddrDistrict(''); }}
                        className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none bg-white">
                        <option value="">縣市</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <select value={addAddrDistrict}
                      onChange={e => setAddAddrDistrict(e.target.value)}
                      disabled={!addAddrCity}
                      className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 disabled:text-gray-400 appearance-none bg-white">
                      <option value="">行政區</option>
                      {(TAIWAN_DISTRICTS[addAddrCity] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <input value={addAddrDetail} onChange={e => setAddAddrDetail(e.target.value)}
                    placeholder="詳細地址（路街巷弄號）"
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
                              <p className="text-xs text-gray-400">估價顧問</p>
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
        </>
      )}

      {/* ── 管理員帳號 tab ── */}
      {activeTab === 'admins' && isAdmin && (
        <>
          <div className="flex justify-end">
            <button onClick={() => { setShowAdminForm(!showAdminForm); setAdminAddError(''); setAdminAddOk(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
              <Plus size={15} />新增管理帳號
            </button>
          </div>

          {showAdminForm && (
            <div className="bg-white rounded-2xl border border-brand-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-1">新增管理帳號</h2>
              <p className="text-xs text-gray-400 mb-4">系統將以指定 Email 建立帳號，並發送設定密碼的邀請信。</p>
              <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
                  <input value={adminForm.display_name} onChange={e => setAdminForm({ ...adminForm, display_name: e.target.value })}
                    required placeholder="王大明"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                  <input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                    required placeholder="admin@example.com"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">角色 *</label>
                  <select value={adminForm.role} onChange={e => setAdminForm({ ...adminForm, role: e.target.value as 'admin' | 'manager' })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    <option value="manager">管理員（不可管理帳號）</option>
                    <option value="admin">最高管理者（全權限）</option>
                  </select>
                </div>
                <div className="sm:col-span-3 flex items-center gap-3">
                  {adminAddError && (
                    <div className="flex items-center gap-1.5 text-sm text-red-600 flex-1">
                      <AlertCircle size={14} />{adminAddError}
                    </div>
                  )}
                  {adminAddOk && <p className="text-sm text-green-600 flex-1">✅ 帳號已建立，邀請信已發送！</p>}
                  <div className="ml-auto flex gap-2">
                    <button type="button" onClick={() => { setShowAdminForm(false); setAdminAddError(''); }}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">取消</button>
                    <button type="submit" disabled={addingAdmin}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
                      {addingAdmin ? '建立中...' : '建立帳號'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {adminLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['帳號', '角色', '建立日期', '操作'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adminUsers.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                              {u.display_name?.[0] ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{u.display_name ?? '未設定'}</p>
                              {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${roleBadge[u.role] ?? ''}`}>
                            {u.role === 'admin' ? <Shield size={11} /> : <UserCog size={11} />}
                            {roleLabel[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-400 text-xs">
                          {new Date(u.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-5 py-4">
                          {u.id !== profile?.id ? (
                            <select
                              value={u.role}
                              onChange={e => updateAdminRole(u.id, e.target.value as 'admin' | 'manager')}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400">
                              <option value="manager">管理員</option>
                              <option value="admin">最高管理者</option>
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">（自己）</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <p className="font-medium mb-1">⚠️ 角色說明</p>
            <p><strong>最高管理者</strong>：可存取所有功能，包含帳號管理</p>
            <p><strong>管理員</strong>：可管理預約、報價、顧問，但不可新增/刪除管理員帳號</p>
          </div>
        </>
      )}

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
