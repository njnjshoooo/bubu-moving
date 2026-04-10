import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Calendar, Truck, FileText } from 'lucide-react';
import { supabase, T, Quote } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const quoteStatusColor: Record<string, string> = {
  '草稿':  'bg-gray-100 text-gray-500',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

const statusColor: Record<string, string> = {
  '待確認': 'bg-yellow-100 text-yellow-700',
  '已確認': 'bg-blue-100 text-blue-700',
  '進行中': 'bg-brand-100 text-brand-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

export default function MemberDashboard() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from(T.bookings)
        .select(`*, time_slots:${T.slots}(date, start_time)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from(T.quotes)
        .select('id, quote_number, total, status, created_at')
        .or(`customer_user_id.eq.${user.id},email.eq.${user.email}`)
        .order('created_at', { ascending: false })
        .limit(3),
    ]).then(([bookRes, quoteRes]) => {
      setBookings(bookRes.data ?? []);
      setQuotes((quoteRes.data as Quote[]) ?? []);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          歡迎回來，{profile?.display_name ?? '會員'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">這裡是您的預約管理中心</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/#booking" className="bg-brand-500 hover:bg-brand-600 text-white rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Calendar size={22} />
          </div>
          <div>
            <p className="font-semibold">預約估價</p>
            <p className="text-sm text-brand-100">選擇時段，預約到府估價</p>
          </div>
        </Link>
        <Link to="/member/bookings" className="bg-white border border-gray-100 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <ClipboardList size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">我的預約</p>
            <p className="text-sm text-gray-500">查看預約記錄</p>
          </div>
        </Link>
        <Link to="/member/quotes" className="bg-white border border-gray-100 hover:shadow-md rounded-2xl p-5 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800">我的報價單</p>
            <p className="text-sm text-gray-500">查看報價與付款</p>
          </div>
        </Link>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">最新預約</h2>
          <Link to="/member/bookings" className="text-sm text-brand-600 hover:underline">查看全部</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center">
            <Truck size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm">尚無預約記錄</p>
            <Link to="/#booking" className="mt-3 inline-block text-sm text-brand-600 hover:underline">立即預約估價</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.map(b => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{b.service_type}</p>
                  {b.time_slots && <p className="text-sm text-gray-500">{b.time_slots.date} {b.time_slots.start_time?.slice(0,5)}</p>}
                  {b.address_from && <p className="text-xs text-gray-400 mt-0.5">{b.address_from}</p>}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status]}`}>{b.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent quotes */}
      {quotes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">最新報價單</h2>
            <Link to="/member/quotes" className="text-sm text-brand-600 hover:underline">查看全部</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {quotes.map(q => (
              <Link key={q.id} to={`/member/quotes/${q.id}`}
                className="px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-800 text-sm font-mono">{q.quote_number}</p>
                  <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('zh-TW')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-brand-600 text-sm">NT${q.total.toLocaleString()}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${quoteStatusColor[q.status]}`}>{q.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
