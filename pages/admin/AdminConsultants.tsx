import React, { useEffect, useState } from 'react';
import { Plus, UserCheck, UserX, Phone, MapPin, Target, X, Shield, UserCog, AlertCircle, Edit2, KeyRound, Mail, User as UserIcon } from 'lucide-react';
import { supabase, AppUser, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TAIWAN_DISTRICTS, CITIES } from '../../lib/taiwanDistricts';

type Role = 'admin' | 'manager' | 'consultant';
type RoleFilter = 'all' | Role;

interface UnifiedUser extends AppUser {
  address?: string | null;
  is_active?: boolean;
  consultant_id?: string;
}

const roleLabel: Record<Role, string> = {
  admin:      '最高管理者',
  manager:    '管理員',
  consultant: '估價顧問',
};
const roleBadge: Record<Role, string> = {
  admin:      'bg-purple-100 text-purple-700',
  manager:    'bg-blue-100 text-blue-700',
  consultant: 'bg-brand-100 text-brand-700',
};
const roleIcon = (r: Role) =>
  r === 'admin' ? <Shield size={11} /> :
  r === 'manager' ? <UserCog size={11} /> :
  <UserIcon size={11} />;

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

export default function AdminConsultants() {
  const { profile, isAdmin } = useAuth();

  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // 新增帳號
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addType, setAddType] = useState<Role | null>(null);
  const [addForm, setAddForm] = useState({ display_name: '', email: '', phone: '', role: 'manager' as 'admin' | 'manager' });
  const [addAddr, setAddAddr] = useState({ city: '', district: '', detail: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addOk, setAddOk] = useState(false);

  // 編輯帳號 Modal
  const [editUser, setEditUser] = useState<UnifiedUser | null>(null);
  const [editForm, setEditForm] = useState({ display_name: '', phone: '', email: '', role: 'manager' as Role });
  const [editAddr, setEditAddr] = useState({ city: '', district: '', detail: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // 月目標 Modal
  const now = new Date();
  const [goalModal, setGoalModal] = useState<UnifiedUser | null>(null);
  const [goalForm, setGoalForm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1, monthly_target: 0 });
  const [savingGoal, setSavingGoal] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    const [{ data: appUsers }, { data: consultants }] = await Promise.all([
      supabase.from(T.users).select('*').in('role', ['admin', 'manager', 'consultant'])
        .order('created_at', { ascending: false }),
      supabase.from(T.consultants).select('*'),
    ]);
    const consultantMap = new Map((consultants ?? []).map((c: any) => [c.user_id, c]));
    const merged: UnifiedUser[] = (appUsers ?? []).map((u: AppUser) => {
      const c = consultantMap.get(u.id) as any;
      return {
        ...u,
        address: c?.address ?? null,
        is_active: c?.is_active ?? true,
        consultant_id: c?.id,
      };
    });
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = roleFilter === 'all' ? users : users.filter(u => u.role === roleFilter);
  const counts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    consultant: users.filter(u => u.role === 'consultant').length,
  };

  // ── 新增帳號 ────────────────────────────────────────────────────────────
  const resetAddForm = () => {
    setAddType(null);
    setAddForm({ display_name: '', email: '', phone: '', role: 'manager' });
    setAddAddr({ city: '', district: '', detail: '' });
    setAddError('');
    setAddOk(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    setAddOk(false);
    try {
      let fnName: string;
      let body: any;
      if (addType === 'consultant') {
        fnName = 'create-consultant';
        const address = [addAddr.city, addAddr.district, addAddr.detail].filter(Boolean).join('');
        body = {
          email: addForm.email,
          display_name: addForm.display_name,
          phone: addForm.phone,
          address: address || null,
        };
      } else {
        fnName = 'create-admin';
        body = {
          email: addForm.email,
          display_name: addForm.display_name,
          role: addType === 'admin' ? 'admin' : 'manager',
        };
      }
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(fnName, { body });
      if (fnErr && !fnData) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      setAddOk(true);
      await loadUsers();
      setTimeout(() => resetAddForm(), 1500);
    } catch (err: any) {
      setAddError(err.message ?? '新增失敗');
    } finally {
      setAdding(false);
    }
  };

  // ── 顧問 啟用/停用 ──────────────────────────────────────────────────────
  const toggleActive = async (u: UnifiedUser) => {
    if (!u.consultant_id) return;
    await supabase.from(T.consultants).update({ is_active: !u.is_active }).eq('id', u.consultant_id);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
  };

  // ── 最高管理者：編輯帳號 Modal ───────────────────────────────────────────
  const openEdit = async (u: UnifiedUser) => {
    setEditUser(u);
    setEditMsg(null);
    setEditForm({ display_name: u.display_name ?? '', phone: u.phone ?? '', email: '', role: u.role as Role });
    setEditAddr(parseAddress(u.address ?? ''));
    setEditLoading(true);
    try {
      const { data } = await supabase.functions.invoke('manage-user', {
        body: { action: 'get_user', user_id: u.id },
      });
      if (data?.ok) {
        setEditForm(f => ({ ...f, email: data.email ?? '' }));
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const address = [editAddr.city, editAddr.district, editAddr.detail].filter(Boolean).join('');
      const roleChanged = editForm.role !== editUser.role;
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update_profile',
          user_id: editUser.id,
          display_name: editForm.display_name,
          phone: editForm.phone,
          address: address || null,
          ...(roleChanged ? { role: editForm.role } : {}),
        },
      });
      if (error && !data) throw error;
      if (data?.error) throw new Error(data.error);
      setEditMsg({ type: 'ok', text: '已更新' });
      await loadUsers();
    } catch (err: any) {
      setEditMsg({ type: 'err', text: err.message ?? '更新失敗' });
    } finally {
      setEditSaving(false);
    }
  };

  const sendResetPassword = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'reset_password', user_id: editUser.id },
      });
      if (error && !data) throw error;
      if (data?.error) throw new Error(data.error);
      setEditMsg({ type: 'ok', text: data?.email_sent ? `重設密碼信已發送至 ${data.email}` : `已產生連結（請檢查 Resend 設定）` });
    } catch (err: any) {
      setEditMsg({ type: 'err', text: err.message ?? '操作失敗' });
    } finally {
      setEditSaving(false);
    }
  };

  const sendVerification = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'resend_verification', user_id: editUser.id },
      });
      if (error && !data) throw error;
      if (data?.error) throw new Error(data.error);
      setEditMsg({ type: 'ok', text: data?.email_sent ? `驗證信已發送至 ${data.email}` : `已產生連結（請檢查 Resend 設定）` });
    } catch (err: any) {
      setEditMsg({ type: 'err', text: err.message ?? '操作失敗' });
    } finally {
      setEditSaving(false);
    }
  };

  // ── 顧問月目標 ──────────────────────────────────────────────────────────
  const openGoalModal = async (u: UnifiedUser) => {
    if (!u.consultant_id) return;
    setGoalModal(u);
    const { data } = await supabase.from(T.goals).select('*')
      .eq('consultant_id', u.consultant_id)
      .eq('year', goalForm.year).eq('month', goalForm.month).maybeSingle();
    if (data) setGoalForm({ year: data.year, month: data.month, monthly_target: data.monthly_target });
  };

  const saveGoal = async () => {
    if (!goalModal?.consultant_id) return;
    setSavingGoal(true);
    await supabase.from(T.goals).upsert({
      consultant_id: goalModal.consultant_id,
      year: goalForm.year, month: goalForm.month,
      monthly_target: goalForm.monthly_target,
    }, { onConflict: 'consultant_id,year,month' });
    setSavingGoal(false);
    setGoalModal(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">帳號管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">管理最高管理者、管理員、估價顧問帳號</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowAddMenu(m => !m)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
            <Plus size={15} />新增帳號
          </button>
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
              <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-20 min-w-[180px]">
                {isAdmin && (
                  <button onClick={() => { setAddType('admin'); setShowAddMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <Shield size={14} className="text-purple-600" />最高管理者
                  </button>
                )}
                {isAdmin && (
                  <button onClick={() => { setAddType('manager'); setShowAddMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    <UserCog size={14} className="text-blue-600" />管理員
                  </button>
                )}
                <button onClick={() => { setAddType('consultant'); setShowAddMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <UserIcon size={14} className="text-brand-600" />估價顧問
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Role Filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          ['all', '全部'],
          ['admin', '最高管理者'],
          ['manager', '管理員'],
          ['consultant', '估價顧問'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setRoleFilter(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              roleFilter === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {label} <span className="text-xs text-gray-400 ml-1">({counts[key]})</span>
          </button>
        ))}
      </div>

      {/* Add Form */}
      {addType && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              新增{addType === 'consultant' ? '估價顧問' : addType === 'admin' ? '最高管理者' : '管理員'}帳號
            </h2>
            <button onClick={resetAddForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
          </div>
          <p className="text-xs text-gray-400 mb-4">系統將以指定 Email 建立帳號，並寄送設定密碼的邀請信。</p>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
              <input value={addForm.display_name} onChange={e => setAddForm({ ...addForm, display_name: e.target.value })}
                required placeholder="王大明"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
              <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                required placeholder="user@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            {addType === 'consultant' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">電話</label>
                  <input value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">住家地址（路線規劃用）</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select value={addAddr.city} onChange={e => setAddAddr({ ...addAddr, city: e.target.value, district: '' })}
                      className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                      <option value="">縣市</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={addAddr.district} onChange={e => setAddAddr({ ...addAddr, district: e.target.value })}
                      disabled={!addAddr.city}
                      className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 bg-white">
                      <option value="">行政區</option>
                      {(TAIWAN_DISTRICTS[addAddr.city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <input value={addAddr.detail} onChange={e => setAddAddr({ ...addAddr, detail: e.target.value })}
                    placeholder="詳細地址"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </>
            )}
            <div className="sm:col-span-2 flex items-center gap-3">
              {addError && <div className="flex items-center gap-1.5 text-sm text-red-600 flex-1"><AlertCircle size={14} />{addError}</div>}
              {addOk && <p className="text-sm text-green-600 flex-1">✅ 帳號已建立，邀請信已發送！</p>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={resetAddForm}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">取消</button>
                <button type="submit" disabled={adding}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
                  {adding ? '建立中...' : '建立帳號'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Unified User Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <UserCheck size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">尚無帳號</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['帳號', '角色', '聯絡', '狀態', '建立', '操作'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                          {u.display_name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{u.display_name ?? '未設定'}</p>
                          {u.address && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              <span className="truncate max-w-[200px]">{u.address}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${roleBadge[u.role as Role] ?? ''}`}>
                        {roleIcon(u.role as Role)}
                        {roleLabel[u.role as Role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {u.phone ? (
                        <div className="flex items-center gap-1 text-gray-600 text-xs">
                          <Phone size={12} />{u.phone}
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {u.role === 'consultant' ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.is_active ? '啟用中' : '已停用'}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('zh-TW')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isAdmin && u.id !== profile?.id && (
                          <button onClick={() => openEdit(u)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            title="編輯帳號資料 / 重設密碼">
                            <Edit2 size={12} />編輯
                          </button>
                        )}
                        {u.role === 'consultant' && u.consultant_id && (
                          <>
                            <button onClick={() => openGoalModal(u)}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50">
                              <Target size={12} />月目標
                            </button>
                            <button onClick={() => toggleActive(u)}
                              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border ${
                                u.is_active
                                  ? 'text-red-500 border-red-200 hover:bg-red-50'
                                  : 'text-green-600 border-green-200 hover:bg-green-50'
                              }`}>
                              {u.is_active ? <><UserX size={12} />停用</> : <><UserCheck size={12} />啟用</>}
                            </button>
                          </>
                        )}
                        {u.id === profile?.id && (
                          <span className="text-xs text-gray-400">（自己）</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 space-y-1">
        <p className="font-medium">⚠️ 角色權限說明</p>
        <p><strong>最高管理者</strong>：可存取所有功能，包含帳號管理、編輯帳號、重設密碼、刪除預約/報價單</p>
        <p><strong>管理員</strong>：可管理預約、報價、顧問，但不可新增/編輯管理帳號</p>
        <p><strong>估價顧問</strong>：可進入顧問後台處理自己的預約與報價</p>
      </div>

      {/* 編輯帳號 Modal */}
      {editUser && isAdmin && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">編輯帳號</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editUser.display_name} ・ {roleLabel[editUser.role as Role]}</p>
              </div>
              <button onClick={() => { setEditUser(null); setEditMsg(null); }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {editLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Email（不可修改）</label>
                    <input value={editForm.email} disabled
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
                    <input value={editForm.display_name}
                      onChange={e => setEditForm({ ...editForm, display_name: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">聯絡電話</label>
                    <input value={editForm.phone}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="0912345678"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>

                  {/* 角色切換（不可修改自己）*/}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">權限角色</label>
                    {editUser.id === profile?.id ? (
                      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500">
                        {roleIcon(editForm.role)}
                        {roleLabel[editForm.role]}
                        <span className="text-xs text-gray-400 ml-auto">（自己的帳號無法修改角色）</span>
                      </div>
                    ) : (
                      <select value={editForm.role}
                        onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                        <option value="admin">最高管理者（全權限）</option>
                        <option value="manager">管理員（不可管理帳號）</option>
                        <option value="consultant">估價顧問（顧問後台）</option>
                      </select>
                    )}
                    {editForm.role !== editUser.role && (
                      <p className="text-xs text-amber-600 mt-1.5">
                        ⚠️ 角色將從「{roleLabel[editUser.role as Role]}」變更為「{roleLabel[editForm.role]}」
                      </p>
                    )}
                  </div>

                  {editForm.role === 'consultant' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">住家地址（路線規劃用）</label>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <select value={editAddr.city}
                          onChange={e => setEditAddr({ ...editAddr, city: e.target.value, district: '' })}
                          className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                          <option value="">縣市</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={editAddr.district}
                          onChange={e => setEditAddr({ ...editAddr, district: e.target.value })}
                          disabled={!editAddr.city}
                          className="w-full px-2 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 bg-white">
                          <option value="">行政區</option>
                          {(TAIWAN_DISTRICTS[editAddr.city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <input value={editAddr.detail}
                        onChange={e => setEditAddr({ ...editAddr, detail: e.target.value })}
                        placeholder="詳細地址"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">密碼與驗證</p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={sendResetPassword} disabled={editSaving}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-60">
                        <KeyRound size={13} />重設密碼
                      </button>
                      <button onClick={sendVerification} disabled={editSaving}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                        <Mail size={13} />重寄驗證信
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">按下後系統會寄信給 {editForm.email || '使用者'}，內含設定密碼的連結（24 小時內有效）。</p>
                  </div>

                  {editMsg && (
                    <div className={`rounded-xl px-4 py-3 text-sm ${editMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {editMsg.text}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
              <button onClick={() => { setEditUser(null); setEditMsg(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
                關閉
              </button>
              <button onClick={handleEditSave} disabled={editSaving || editLoading}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
                {editSaving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 月目標 Modal */}
      {goalModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">設定月目標 — {goalModal.display_name}</h3>
              <button onClick={() => setGoalModal(null)} className="p-1 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
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
                  placeholder="300000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
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
