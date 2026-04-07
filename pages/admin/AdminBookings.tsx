import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, FileText, Phone, MapPin, Calendar } from 'lucide-react';
import { supabase, Booking } from '../../lib/supabase';

const STATUSES = ['全部', '待確認', '已確認', '進行中', '已完成', '已取消'];
const statusColor: Record<string, string> = {
  '待確認': 'bg-yellow-100 text-yellow-700',
  '已確認': 'bg-blue-100 text-blue-700',
  '進行中': 'bg-brand-100 text-brand-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, time_slots(date, start_time, end_time)')
      .order('created_at', { ascending: false });
    setBookings((data as Booking[]) ?? []);
    setFiltered((data as Booking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  useEffect(() => {
    let result = bookings;
    if (statusFilter !== '全部') result = result.filter(b => b.status === statusFilter);
    if (search) result = result.filter(b =>
      b.customer_name.includes(search) || b.phone.includes(search) || (b.address_from ?? '').includes(search)
    );
    setFiltered(result);
  }, [search, statusFilter, bookings]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    fetchBookings();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">預約管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {filtered.length} 筆記錄</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋姓名、電話、地址..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-400" />
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">無符合條件的預約</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['客戶', '聯絡方式', '預約時段', '地址', '狀態', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{b.customer_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600"><Phone size={13} />{b.phone}</div>
                      {b.email && <div className="text-xs text-gray-400 mt-0.5">{b.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {b.time_slots ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar size={13} />
                          {b.time_slots.date} {b.time_slots.start_time?.slice(0,5)}
                        </div>
                      ) : <span className="text-gray-400">未選時段</span>}
                    </td>
                    <td className="px-4 py-3">
                      {b.address_from && (
                        <div className="flex items-center gap-1 text-gray-600 max-w-[200px]">
                          <MapPin size={13} className="flex-shrink-0" />
                          <span className="truncate">{b.address_from}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-brand-400 ${statusColor[b.status]}`}>
                        {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/quotes/new/${b.id}`}
                        className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors">
                        <FileText size={13} />建立報價
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
