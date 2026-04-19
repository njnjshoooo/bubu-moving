import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Truck, LayoutDashboard, Calendar, ClipboardList,
  FileText, LogOut, Menu, ChevronRight, Users, Settings,
  Package, ShoppingBag, Camera
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/admin', label: '儀表板', icon: LayoutDashboard, end: true, adminOnly: false },
  { to: '/admin/calendar', label: '行事曆管理', icon: Calendar, adminOnly: false },
  { to: '/admin/bookings', label: '預約單管理', icon: ClipboardList, adminOnly: false },
  { to: '/admin/quotes', label: '報價單', icon: FileText, adminOnly: false },
  { to: '/admin/products', label: '商品管理', icon: Package, adminOnly: false },
  { to: '/admin/orders', label: '訂購單', icon: ShoppingBag, adminOnly: false },
  { to: '/admin/cases', label: '案例分享管理', icon: Camera, adminOnly: false },
  { to: '/admin/consultants', label: '帳號管理', icon: Users, adminOnly: false },
  { to: '/admin/settings', label: '系統設定', icon: Settings, adminOnly: false },
];

export default function AdminLayout() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const Sidebar = () => (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-lg flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm">步步搬家</p>
            <p className="text-xs text-gray-400">管理後台</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-brand-500 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-sm font-bold">
            {profile?.display_name?.[0] ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name ?? '管理員'}</p>
            <p className="text-xs text-gray-400">管理員</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
        >
          <LogOut size={16} />
          登出
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex-shrink-0"><Sidebar /></div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <ChevronRight size={16} className="text-gray-300 hidden lg:block" />
          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
