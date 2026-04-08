import React, { useEffect, useState } from 'react';
import { Calendar, MapPin, Phone, Clock } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const statusColor: Record<string, string> = {
  '待確認': 'bg-yellow-100 text-yellow-700',
  '已確認': 'bg-blue-100 text-blue-700',
  '進行中': 'bg-brand-100 text-brand-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

export default function MemberBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from(T.bookings)
      .select(`*, time_slots:${T.slots}(date, start_time, end_time)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setBookings(data ?? []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="text-center py-12 text-gray-400">載入中...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">我的預約</h1>
        <p className="text-sm text-gray-500 mt-1">共 {bookings.length} 筆預約記錄</p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Calendar size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">尚無預約記錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-800">{b.service_type}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status]}`}>{b.status}</span>
                  </div>
                  {b.time_slots && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{b.time_slots.date}</span>
                      <Clock size={14} className="ml-1" />
                      <span>{b.time_slots.start_time?.slice(0,5)} – {b.time_slots.end_time?.slice(0,5)}</span>
                    </div>
                  )}
                  {b.address_from && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span>{b.address_from}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Phone size={14} />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.notes && <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mt-1">{b.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('zh-TW')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
