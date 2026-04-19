import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Mail, Lock, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type LoginTab = 'email' | 'phone';

export default function LoginPage() {
  const { signIn, user, profile } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<LoginTab>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginDone, setLoginDone] = useState(false);

  // 登入成功後依角色跳轉
  useEffect(() => {
    if (!loginDone || !user || !profile) return;
    if (profile.role === 'admin' || profile.role === 'manager') {
      navigate('/admin');
    } else if (profile.role === 'consultant') {
      navigate('/consultant');
    } else {
      navigate('/member');
    }
  }, [loginDone, user, profile, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('帳號或密碼錯誤，請重新嘗試');
    } else {
      setLoginDone(true);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 用 RPC 從手機號找對應的 email
      const { data: foundEmail, error: rpcErr } = await supabase.rpc('get_email_by_phone', {
        p_phone: phone.trim(),
      });
      if (rpcErr || !foundEmail) {
        setError('此手機號碼尚未註冊，請改用 Email 登入或先完成註冊');
        setLoading(false);
        return;
      }
      const { error: signInErr } = await signIn(foundEmail as string, password);
      if (signInErr) {
        setError('密碼錯誤，請重新嘗試');
      } else {
        setLoginDone(true);
      }
    } catch {
      setError('登入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all text-sm';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <Truck className="text-white" size={24} />
            </div>
            <span className="text-2xl font-bold text-gray-800">步步搬家</span>
          </Link>
          <p className="mt-3 text-gray-500">登入您的帳號</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {([['email', '電子信箱', Mail], ['phone', '手機號碼', Phone]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg font-medium transition-all ${
                  tab === key ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {/* Email Form */}
          {tab === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">電子信箱</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    required placeholder="your@email.com" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className={inputCls} />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {loading ? '登入中...' : '登入'}
              </button>
            </form>
          )}

          {/* Phone Form */}
          {tab === 'phone' && (
            <form onSubmit={handlePhoneLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">手機號碼</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    required placeholder="0912345678" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密碼</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    required placeholder="••••••••" className={inputCls} />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60">
                {loading ? '查詢中...' : '登入'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            還沒有帳號？{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">立即註冊</Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
            ← 回到首頁
          </Link>
        </p>
      </div>
    </div>
  );
}
