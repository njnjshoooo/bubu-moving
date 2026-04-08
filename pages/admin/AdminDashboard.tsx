import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';

interface Stats {
  totalBookings: number;
  pendingBookings: number;
  totalQuotes: number;
  draftQuotes: number;
  upcomingSlots: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalBookings: 0, pendingBookings: 0, totalQuotes: 0, draftQuotes: 0, upcomingSlots: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      const [bookingsRes, quotesRes, slotsRes, recentRes] = await Promise.all([
        supabase.from(T.bookings).select('status'),
        supabase.from(T.quotes).select('status'),
        supabase.from(T.slots).select('id').gte('date', today).eq('is_active', true),
        supabase.from(T.bookings).select(`*, time_slots:${T.slots}(date, start_time)`).order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({
        totalBookings: bookingsRes.data?.length ?? 0,
        pendingBookings: bookingsRes.data?.filter(b => b.status === '待確認').length ?? 0,
        totalQuotes: quotesRes.data?.length ?? 0,
        draftQuotes: quotesRes.data?.filter(q => q.status === '草稿').length ?? 0,
        upcomingSlots: slotsRes.data?.length ?? 0,
      });
      setRecentBookings(recentRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const statusColor: Record<string, string> = {
    '待確認': 'bg-yellow-100 text-yellow-700',
    '已確認': 'bg-blue-100 text-blue-700',
    '進行中': 'bg-brand-100 text-brand-700',
    '已完成': 'bg-green-100 text-green-700',
    '已取消': 'bg-gray-100 text-gray-500',
  };

  const cards = [
    { label: '總預約數', value: stats.totalBookings, sub: `${stats.pendingBookings} 筆待確認`, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', link: '/admin/bookings' },
    { label: '總報價單', value: stats.totalQuotes, sub: `${stats.draftQuotes} 份草稿`, icon: FileText, color: 'bg-brand-50 text-brand-600', link: '/admin/quotes' },
    { label: '即將到來的時段', value: stats.upcomingSlots, sub: '可預約時段數', icon: Calendar, color: 'bg-green-50 text-green-600', link: '/admin/calendar' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">儀表板</h1>
        <p className="text-gray-500 text-sm mt-1">歡迎回來！以下是今日概況。</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link key={card.label} to={card.link} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{card.label}</p>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800">{loading ? '—' : card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/quotes/new" className="bg-brand-500 hover:bg-brand-600 text-white rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="font-semibold">建立新報價單</p>
            <p className="text-sm text-brand-100">快速為客戶建立報價</p>
          </div>
        </Link>
        <Link to="/admin/calendar" className="bg-white border border-gray-100 hover:shadow-md text-gray-800 rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Calendar size={24} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold">管理估價時段</p>
            <p className="text-sm text-gray-500">開放或關閉可預約時段</p>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">最新預約</h2>
          <Link to="/admin/bookings" className="text-sm text-brand-600 hover:underline">查看全部</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : recentBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">尚無預約記錄</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentBookings.map(b => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{b.customer_name}</p>
                  <p className="text-sm text-gray-500">{b.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status]}`}>{b.status}</span>
                  {b.time_slots && (
                    <p className="text-xs text-gray-400 mt-1">{b.time_slots.date}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
