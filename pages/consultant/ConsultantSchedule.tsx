import React, { useEffect, useState } from 'react';
import { MapPin, Phone, Navigation, Calendar, Clock, User } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ScheduleBooking {
  id: string;
  customer_name: string;
  phone: string;
  address_from: string | null;
  city: string | null;
  district: string | null;
  address_detail: string | null;
  status: string;
  is_waitlist: boolean;
  time_slots: { date: string; start_time: string; end_time: string } | null;
}

interface ConsultantInfo {
  id: string;
  address: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  '已確認': 'bg-green-100 text-green-700',
  '進行中': 'bg-blue-100 text-blue-700',
  '已完成': 'bg-gray-100 text-gray-500',
  '待確認': 'bg-yellow-50 text-yellow-700',
  '已取消': 'bg-red-100 text-red-500',
};

export default function ConsultantSchedule() {
  const { user } = useAuth();
  const [consultant, setConsultant] = useState<ConsultantInfo | null>(null);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      // Get consultant profile
      const { data: cData } = await supabase
        .from(T.consultants).select('id, address')
        .eq('user_id', user.id).single();
      if (!cData) { setLoading(false); return; }
      setConsultant(cData as ConsultantInfo);

      // Get slot IDs assigned to this consultant
      const { data: slotLinks } = await supabase
        .from(T.slotConsultants).select('slot_id')
        .eq('consultant_id', cData.id);
      const slotIds = (slotLinks ?? []).map((l: any) => l.slot_id);
      if (slotIds.length === 0) { setLoading(false); return; }

      // Get bookings for these slots
      const { data: bData } = await supabase
        .from(T.bookings)
        .select(`id, customer_name, phone, address_from, city, district, address_detail, status, is_waitlist, time_slots:${T.slots}(date, start_time, end_time)`)
        .in('time_slot_id', slotIds)
        .neq('status', '已取消')
        .order('created_at', { ascending: false });
      setBookings((bData ?? []) as ScheduleBooking[]);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const todayBookings = bookings.filter(b => b.time_slots?.date === selectedDate);
  const upcomingBookings = bookings.filter(b => b.time_slots?.date && b.time_slots.date > selectedDate).slice(0, 5);

  const buildMapsUrl = (stops: string[]) => {
    if (stops.length === 0) return '#';
    const allStops = consultant?.address
      ? [consultant.address, ...stops]
      : stops;
    return `https://www.google.com/maps/dir/${allStops.map(encodeURIComponent).join('/')}`;
  };

  const todayAddresses = todayBookings
    .map(b => b.address_from || [b.city, b.district, b.address_detail].filter(Boolean).join(''))
    .filter(Boolean);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">我的排程</h1>
          <p className="text-sm text-gray-400 mt-0.5">查看指派給您的預約</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">查看日期</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
      </div>

      {/* Today / Selected date */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-green-500" />
            {selectedDate} 的預約 ({todayBookings.length} 筆)
          </h2>
          {todayAddresses.length > 0 && (
            <a href={buildMapsUrl(todayAddresses)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl transition-all">
              <Navigation size={15} />規劃今日路線
            </a>
          )}
        </div>

        {todayBookings.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>此日期無指派預約</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayBookings.map(b => {
              const address = b.address_from || [b.city, b.district, b.address_detail].filter(Boolean).join('');
              return (
                <div key={b.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User size={15} className="text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-800">{b.customer_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                        {b.is_waitlist && <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">候補</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone size={13} className="flex-shrink-0" />
                        <a href={`tel:${b.phone}`} className="hover:text-green-600">{b.phone}</a>
                      </div>
                      {b.time_slots && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock size={13} className="flex-shrink-0" />
                          {b.time_slots.start_time?.slice(0,5)} – {b.time_slots.end_time?.slice(0,5)}
                        </div>
                      )}
                      {address && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MapPin size={13} className="flex-shrink-0" />
                          <span>{address}</span>
                        </div>
                      )}
                    </div>
                    {address && (
                      <a href={buildMapsUrl([address])} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-green-600 border border-green-200 hover:bg-green-50 px-3 py-2 rounded-xl transition-all">
                        <Navigation size={14} />導航
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcomingBookings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">即將到來的預約</h2>
          <div className="space-y-3">
            {upcomingBookings.map(b => {
              const address = b.address_from || [b.city, b.district, b.address_detail].filter(Boolean).join('');
              return (
                <div key={b.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{b.customer_name}　<span className="text-gray-400 font-normal">{b.time_slots?.date}</span></p>
                    {address && <p className="text-xs text-gray-500 mt-0.5">{address}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
