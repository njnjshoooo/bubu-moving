import React from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { Truck, LayoutDashboard, ClipboardList, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/member', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/member/bookings', label: '我的預約', icon: ClipboardList },
  { to: '/member/quotes', label: '我的報價單', icon: FileText },
  { to: '/member/profile', label: '個人資料', icon: User },
];

export default function MemberLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-800">步步搬家</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">{profile?.display_name ?? '會員'}</span>
            <button onClick={async () => { await signOut(); navigate('/'); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <LogOut size={15} />登出
            </button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-1 border-t border-gray-100">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-all ${
                  isActive ? 'border-brand-500 text-brand-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`
              }>
              <Icon size={15} />{label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
