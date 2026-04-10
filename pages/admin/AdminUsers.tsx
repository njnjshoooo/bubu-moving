import React, { useEffect, useState } from 'react';
import { Plus, Shield, UserCog, AlertCircle } from 'lucide-react';
import { supabase, AppUser, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AdminUserRow extends AppUser {
  email?: string;
}

const roleLabel: Record<string, string> = {
  admin:   '最高管理者',
  manager: '主管',
};
const roleBadge: Record<string, string> = {
  admin:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
};

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ display_name: '', email: '', role: 'manager' as 'admin' | 'manager' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addOk, setAddOk] = useState(false);

  const loadUsers = async () => {
    const { data } = await supabase
      .from(T.users)
      .select('*')
      .in('role', ['admin', 'manager'])
      .order('created_at', { ascending: false });
    setUsers((data as AdminUserRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    setAddOk(false);
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('create-admin', {
        body: {
          email: form.email,
          display_name: form.display_name,
          role: form.role,
        },
      });
      if (fnErr) throw fnErr;
      if (fnData?.error) throw new Error(fnData.error);
      setAddOk(true);
      setForm({ display_name: '', email: '', role: 'manager' });
      await loadUsers();
      setTimeout(() => { setShowForm(false); setAddOk(false); }, 1500);
    } catch (err: any) {
      setAddError(err.message ?? '新增失敗，請稍後再試');
    } finally {
      setAdding(false);
    }
  };

  const updateRole = async (userId: string, newRole: 'admin' | 'manager') => {
    if (userId === profile?.id) return; // 不能改自己
    await supabase.from(T.users).update({ role: newRole }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">用戶管理</h1>
          <p className="text-sm text-gray-400 mt-0.5">管理管理員與主管帳號</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setAddError(''); setAddOk(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
          <Plus size={15} />新增管理帳號
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">新增管理帳號</h2>
          <p className="text-xs text-gray-400 mb-4">系統將以指定 Email 建立帳號，並發送設定密碼的邀請信。</p>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
              <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}
                required placeholder="王大明"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                required placeholder="admin@example.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">角色 *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'manager' })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="manager">主管（不可管理帳號）</option>
                <option value="admin">最高管理者（全權限）</option>
              </select>
            </div>
            <div className="sm:col-span-3 flex items-center gap-3">
              {addError && (
                <div className="flex items-center gap-1.5 text-sm text-red-600 flex-1">
                  <AlertCircle size={14} />{addError}
                </div>
              )}
              {addOk && <p className="text-sm text-green-600 flex-1">✅ 帳號已建立，邀請信已發送！</p>}
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => { setShowForm(false); setAddError(''); }}
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

      {/* User List */}
      {loading ? (
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
                {users.map(u => (
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
                          onChange={e => updateRole(u.id, e.target.value as 'admin' | 'manager')}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400"
                        >
                          <option value="manager">主管</option>
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
        <p><strong>最高管理者</strong>：可存取所有功能，包含用戶管理</p>
        <p><strong>主管</strong>：可管理預約、報價、顧問，但不可新增/刪除管理員帳號</p>
      </div>
    </div>
  );
}
