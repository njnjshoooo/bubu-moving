import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, Calendar, Users, TrendingUp } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';

const RANGE_OPTIONS = [
  { label: '今日', value: 'today' },
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' },
  { label: '近 90 天', value: '90d' },
  { label: '全部', value: 'all' },
];

function getRangeStart(range: string): string | null {
  const now = new Date();
  if (range === 'today') {
    return now.toISOString().split('T')[0];
  }
  if (range === '7d') {
    const d = new Date(now); d.setDate(d.getDate() - 6); return d.toISOString().split('T')[0];
  }
  if (range === '30d') {
    const d = new Date(now); d.setDate(d.getDate() - 29); return d.toISOString().split('T')[0];
  }
  if (range === '90d') {
    const d = new Date(now); d.setDate(d.getDate() - 89); return d.toISOString().split('T')[0];
  }
  return null; // all
}

const statusColor: Record<string, string> = {
  '待確認': 'bg-yellow-100 text-yellow-700',
  '已確認': 'bg-blue-100 text-blue-700',
  '進行中': 'bg-brand-100 text-brand-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

const quoteStatusColor: Record<string, string> = {
  '草稿': 'bg-gray-100 text-gray-500',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

export default function AdminDashboard() {
  const [range, setRange] = useState('30d');
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [consultants, setConsultants] = useState<any[]>([]);
  const [consultantStats, setConsultantStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const rangeStart = getRangeStart(range);

      let bQuery = supabase.from(T.bookings)
        .select(`*, time_slots:${T.slots}(date, start_time), consultant:${T.consultants}(display_name)`)
        .order('created_at', { ascending: false });
      if (rangeStart) bQuery = bQuery.gte('created_at', rangeStart);

      let qQuery = supabase.from(T.quotes).select('id, status, total, consultant_id, created_at').order('created_at', { ascending: false });
      if (rangeStart) qQuery = qQuery.gte('created_at', rangeStart);

      const [bRes, qRes, sRes, cRes] = await Promise.all([
        bQuery,
        qQuery,
        supabase.from(T.slots).select('id, date, max_bookings, current_bookings').gte('date', today).order('date').limit(60),
        supabase.from(T.consultants).select('id, display_name').eq('is_active', true),
      ]);

      const bData = bRes.data ?? [];
      const qData = qRes.data ?? [];
      setBookings(bData);
      setQuotes(qData);
      setSlots(sRes.data ?? []);
      const cData = cRes.data ?? [];
      setConsultants(cData);

      // Per-consultant stats
      const stats = cData.map((c: any) => {
        const cBookings = bData.filter((b: any) => b.assigned_consultant_id === c.id);
        const cQuotes = qData.filter((q: any) => q.consultant_id === c.id);
        return {
          id: c.id,
          name: c.display_name,
          booked: cBookings.filter((b: any) => b.status !== '已取消').length,
          completed: cBookings.filter((b: any) => b.status === '已完成').length,
          quoted: cQuotes.filter((q: any) => ['已發送', '已確認'].includes(q.status)).length,
          confirmed: cQuotes.filter((q: any) => q.status === '已確認').length,
          revenue: cQuotes.filter((q: any) => q.status === '已確認').reduce((s: number, q: any) => s + (q.total ?? 0), 0),
        };
      }).filter((c: any) => c.booked + c.quoted > 0 || cData.length <= 5);

      setConsultantStats(stats);
      setLoading(false);
    };
    fetchData();
  }, [range]);

  // Summary cards
  const totalBookings = bookings.filter(b => b.status !== '已取消').length;
  const pendingBookings = bookings.filter(b => b.status === '待確認').length;
  const totalQuotes = quotes.length;
  const confirmedRevenue = quotes.filter(q => q.status === '已確認').reduce((s, q) => s + (q.total ?? 0), 0);

  // Quote status breakdown
  const quoteStatusMap: Record<string, number> = {};
  for (const q of quotes) {
    quoteStatusMap[q.status] = (quoteStatusMap[q.status] ?? 0) + 1;
  }

  // Calendar heatmap: group slots by date
  const slotsByDate = useMemo(() => {
    return slots.reduce((acc: Record<string, any[]>, s: any) => {
      acc[s.date] = acc[s.date] ?? [];
      acc[s.date].push(s);
      return acc;
    }, {});
  }, [slots]);

  // Build heatmap calendar (current month + next month)
  const now = new Date();
  const heatmapYear = now.getFullYear();
  const heatmapMonth = now.getMonth();
  const firstDay = new Date(heatmapYear, heatmapMonth, 1).getDay();
  const daysInMonth = new Date(heatmapYear, heatmapMonth + 1, 0).getDate();
  const today = now.toISOString().split('T')[0];

  const getHeatColor = (date: string) => {
    const daySlots = slotsByDate[date];
    if (!daySlots || daySlots.length === 0) return '';
    const totalBooked = daySlots.reduce((s: number, sl: any) => s + (sl.current_bookings ?? 0), 0);
    const totalMax = daySlots.reduce((s: number, sl: any) => s + (sl.max_bookings ?? 0), 0);
    if (totalMax === 0) return 'bg-gray-100';
    const ratio = totalBooked / totalMax;
    if (ratio === 0) return 'bg-green-100 text-green-700';
    if (ratio < 0.5) return 'bg-yellow-100 text-yellow-700';
    if (ratio < 1) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const recentBookings = bookings.slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header + Range selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">儀表板</h1>
          <p className="text-gray-500 text-sm mt-1">業務概況總覽</p>
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                range === opt.value ? 'bg-brand-500 text-white font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/bookings" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">預約單</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{loading ? '—' : totalBookings}</p>
          <p className="text-xs text-yellow-600 mt-1">{loading ? '' : `${pendingBookings} 筆待確認`}</p>
        </Link>
        <Link to="/admin/quotes" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">報價單</p>
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <FileText size={18} className="text-brand-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{loading ? '—' : totalQuotes}</p>
          <p className="text-xs text-gray-400 mt-1">{loading ? '' : `${quoteStatusMap['已確認'] ?? 0} 筆已確認`}</p>
        </Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">確認收入</p>
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{loading ? '—' : `NT$${confirmedRevenue.toLocaleString()}`}</p>
          <p className="text-xs text-gray-400 mt-1">已確認報價單合計</p>
        </div>
        <Link to="/admin/calendar" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">可預約時段</p>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Calendar size={18} className="text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-800">{loading ? '—' : slots.length}</p>
          <p className="text-xs text-gray-400 mt-1">未來可用時段數</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar heatmap */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">
            本月預約熱度
            <span className="text-xs font-normal text-gray-400 ml-2">顏色越深=預約越滿</span>
          </h2>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日','一','二','三','四','五','六'].map(d => (
              <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const d = i + 1;
              const ds = `${heatmapYear}-${String(heatmapMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const heatColor = getHeatColor(ds);
              const daySlots = slotsByDate[ds] ?? [];
              const totalBooked = daySlots.reduce((s: number, sl: any) => s + (sl.current_bookings ?? 0), 0);
              const totalMax = daySlots.reduce((s: number, sl: any) => s + (sl.max_bookings ?? 0), 0);
              const isToday = ds === today;
              return (
                <div key={d}
                  title={totalMax > 0 ? `${ds}: ${totalBooked}/${totalMax} 已預約` : ds}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all ${
                    isToday ? 'ring-2 ring-brand-500' : ''
                  } ${heatColor || 'bg-gray-50 text-gray-400'}`}>
                  <span className="font-medium">{d}</span>
                  {totalMax > 0 && (
                    <span className="text-xs opacity-70 leading-none">{totalBooked}/{totalMax}</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
            {[
              { color: 'bg-green-100', label: '空閒' },
              { color: 'bg-yellow-100', label: '少量' },
              { color: 'bg-orange-100', label: '較多' },
              { color: 'bg-red-100', label: '已滿' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quote status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">報價單追蹤</h2>
          {loading ? (
            <div className="text-center text-gray-400 py-8">載入中...</div>
          ) : (
            <div className="space-y-3">
              {(['草稿', '已發送', '已確認', '已取消'] as const).map(status => {
                const count = quoteStatusMap[status] ?? 0;
                const pct = totalQuotes > 0 ? Math.round(count / totalQuotes * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${quoteStatusColor[status]}`}>{status}</span>
                      <span className="text-sm font-semibold text-gray-700">{count} 筆</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-brand-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {totalQuotes > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">確認率</span>
                    <span className="font-semibold text-green-600">
                      {Math.round((quoteStatusMap['已確認'] ?? 0) / totalQuotes * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
            <Link to="/admin/quotes/new" className="flex items-center gap-2 w-full px-3 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
              <FileText size={15} />建立新報價單
            </Link>
            <Link to="/admin/calendar" className="flex items-center gap-2 w-full px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm rounded-xl transition-all">
              <Calendar size={15} />管理估價時段
            </Link>
          </div>
        </div>
      </div>

      {/* Per-consultant stats */}
      {consultantStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Users size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-800">顧問業績統計</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">載入中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['顧問', '已預約', '已完成', '已報價', '已確認', '確認金額'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {consultantStats.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.booked}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{c.completed}</td>
                      <td className="px-4 py-3 text-blue-600">{c.quoted}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{c.confirmed}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">NT${c.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Team totals */}
                  <tr className="bg-brand-50 border-t-2 border-brand-200">
                    <td className="px-4 py-3 font-bold text-brand-700">合計</td>
                    <td className="px-4 py-3 font-semibold">{consultantStats.reduce((s, c) => s + c.booked, 0)}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">{consultantStats.reduce((s, c) => s + c.completed, 0)}</td>
                    <td className="px-4 py-3 font-semibold text-blue-600">{consultantStats.reduce((s, c) => s + c.quoted, 0)}</td>
                    <td className="px-4 py-3 font-semibold text-green-700">{consultantStats.reduce((s, c) => s + c.confirmed, 0)}</td>
                    <td className="px-4 py-3 font-bold text-brand-700">NT${consultantStats.reduce((s, c) => s + c.revenue, 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recent bookings */}
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
              <div key={b.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{b.customer_name}</p>
                  <p className="text-xs text-gray-500">{b.phone}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[b.status]}`}>{b.status}</span>
                  {b.time_slots && (
                    <p className="text-xs text-gray-400 mt-0.5">{b.time_slots.date}</p>
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
