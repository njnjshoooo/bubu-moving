import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Truck, CalendarDays, User, LogOut, Menu, BarChart3, Calendar, ClipboardList, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/consultant/dashboard', label: '業績儀表板', icon: BarChart3 },
  { to: '/consultant', label: '我的排程', icon: CalendarDays, end: true },
  { to: '/consultant/calendar', label: '行事曆管理', icon: Calendar },
  { to: '/consultant/bookings', label: '預約單管理', icon: ClipboardList },
  { to: '/consultant/quotes', label: '報價單', icon: FileText },
  { to: '/consultant/profile', label: '個人資料', icon: User },
];

export default function ConsultantLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const Sidebar = () => (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-lg flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">步步搬家</p>
            <p className="text-xs text-gray-400">顧問後台</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end = false }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive ? 'bg-green-600 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />{label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-sm font-bold">
            {profile?.display_name?.[0] ?? 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name ?? '顧問'}</p>
            <p className="text-xs text-gray-400">顧問</p>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all">
          <LogOut size={16} />登出
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex-shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
