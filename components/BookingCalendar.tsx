import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, Phone, MapPin, CheckCircle, ChevronLeft, ChevronRight, Mail, Search, X } from 'lucide-react';
import { supabase, TimeSlot, T } from '../lib/supabase';
import { TAIWAN_DISTRICTS, CITIES } from '../lib/taiwanDistricts';
import { syncBookingToGcal } from '../lib/gcalSync';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

type Step = 'calendar' | 'form' | 'success';

interface BookingForm {
  customer_name: string;
  phone: string;
  email: string;
  // 舊址
  city: string;
  district: string;
  address_detail: string;
  // 新址
  to_city: string;
  to_district: string;
  to_detail: string;
  // 其他
  moving_date: string;
  notes: string;
}

interface LookupBooking {
  id: string;
  status: string;
  email: string | null;
  address_from: string | null;
  time_slots?: { date: string; start_time: string; end_time: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  '已確認': 'bg-green-100 text-green-700',
  '已完成': 'bg-blue-100 text-blue-700',
  '已取消': 'bg-red-100 text-red-600',
  '進行中': 'bg-purple-100 text-purple-700',
  '待確認': 'bg-yellow-50 text-yellow-700',
};

export default function BookingCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState<BookingForm>({
    customer_name: '', phone: '', email: '',
    city: '', district: '', address_detail: '',
    to_city: '', to_district: '', to_detail: '',
    moving_date: '', notes: '',
  });
  const [step, setStep] = useState<Step>('calendar');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Lookup / Cancel
  const [lookupName, setLookupName] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<LookupBooking[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase.from(T.slots).select('*')
      .eq('is_active', true)
      .gte('date', today)
      .order('date').order('start_time')
      .then(({ data }) => setSlots((data ?? []) as TimeSlot[]));
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const slotsByDate = slots.reduce((acc, s) => {
    acc[s.date] = acc[s.date] ?? [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const getSlotStatus = (slot: TimeSlot) => {
    const maxBookings = slot.max_bookings ?? 1;
    const maxWaitlist = slot.max_waitlist ?? 2;
    const current = slot.current_bookings ?? 0;
    if (current < maxBookings) return { available: true, isWaitlist: false, remaining: maxBookings - current, waitlistPos: 0 };
    if (current < maxBookings + maxWaitlist) return { available: true, isWaitlist: true, remaining: 0, waitlistPos: current - maxBookings + 1 };
    return { available: false, isWaitlist: false, remaining: 0, waitlistPos: 0 };
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    const status = getSlotStatus(slot);
    setSelectedSlot(slot);
    setIsWaitlist(status.isWaitlist);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setError('');
    setSubmitting(true);
    const address_from = [form.city, form.district, form.address_detail].filter(Boolean).join('');
    const address_to = [form.to_city, form.to_district, form.to_detail].filter(Boolean).join('');
    const { data: bookingData, error: err } = await supabase.from(T.bookings).insert({
      time_slot_id: selectedSlot.id,
      customer_name: form.customer_name,
      phone: form.phone,
      email: form.email || null,
      city: form.city,
      district: form.district,
      address_detail: form.address_detail,
      address_from,
      address_to_city: form.to_city || null,
      address_to_district: form.to_district || null,
      address_to_detail: form.to_detail || null,
      address_to: address_to || null,
      moving_date: form.moving_date || null,
      notes: form.notes || null,
      service_type: '到府估價',
      is_waitlist: isWaitlist,
    }).select('id').single();
    if (err) {
      setError('預約失敗，請稍後再試或致電我們。');
      setSubmitting(false);
      return;
    }
    await supabase.from(T.slots)
      .update({ current_bookings: (selectedSlot.current_bookings ?? 0) + 1 })
      .eq('id', selectedSlot.id);
    // 同步到 Google Calendar（靜默失敗）
    if (bookingData?.id) syncBookingToGcal(bookingData.id);
    // 寄確認信（非關鍵，失敗不影響主流程）
    if (bookingData?.id && form.email) {
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: { booking_id: bookingData.id, event_type: 'booking_created' },
        });
      } catch (_) { /* ignore */ }
    }
    // Line 通知（非關鍵，失敗不影響主流程）
    try {
      await supabase.functions.invoke('send-line-message', {
        body: {
          message: `🏠 新預約通知\n姓名：${form.customer_name}\n電話：${form.phone}\n地址：${address_from}\n時段：${selectedSlot.date} ${selectedSlot.start_time.slice(0, 5)}–${selectedSlot.end_time.slice(0, 5)}${isWaitlist ? '\n⚠️ 候補名單' : ''}`,
        },
      });
    } catch (_) { /* ignore */ }
    setStep('success');
    setSubmitting(false);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupName.trim() || !lookupPhone.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResults([]);
    const { data, error: err } = await supabase.from(T.bookings)
      .select(`id, status, email, address_from, is_waitlist, time_slots:${T.slots}(date, start_time, end_time)`)
      .eq('customer_name', lookupName.trim())
      .eq('phone', lookupPhone.trim())
      .order('created_at', { ascending: false })
      .limit(3);
    if (err || !data || data.length === 0) {
      setLookupError('查無預約記錄，請確認姓名與電話是否正確。');
    } else {
      setLookupResults(data as LookupBooking[]);
    }
    setLookupLoading(false);
  };

  const handleCancel = async (bookingId: string) => {
    setCancellingId(bookingId);
    await supabase.from(T.bookings).update({ status: '已取消' }).eq('id', bookingId);
    // 同步到 Google Calendar
    syncBookingToGcal(bookingId);
    // 寄取消確認信（非關鍵，失敗不影響主流程）
    const booking = lookupResults.find(b => b.id === bookingId);
    if (booking?.email) {
      try {
        await supabase.functions.invoke('send-booking-email', {
          body: { booking_id: bookingId, event_type: 'booking_cancelled' },
        });
      } catch (_) { /* ignore */ }
    }
    setLookupResults(prev => prev.map(b => b.id === bookingId ? { ...b, status: '已取消' } : b));
    setCancellingId(null);
  };

  const resetForm = () => {
    setStep('calendar');
    setSelectedSlot(null);
    setIsWaitlist(false);
    setForm({
      customer_name: '', phone: '', email: '',
      city: '', district: '', address_detail: '',
      to_city: '', to_district: '', to_detail: '',
      moving_date: '', notes: '',
    });
  };

  // ─── Success Screen ───────────────────────────────────────────────────────────
  if (step === 'success') {
    const address_from = [form.city, form.district, form.address_detail].filter(Boolean).join('');
    return (
      <section id="booking" className="py-16 bg-brand-50">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-sm p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500" size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {isWaitlist ? '候補登記成功！' : '預約成功！'}
            </h3>
            <p className="text-gray-500 mb-4">
              <strong>{form.customer_name}</strong> 您好，您已成功{isWaitlist ? '加入候補' : '預約'}：
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-4 space-y-1 text-left">
              <p><span className="text-gray-400">日期：</span>{selectedSlot?.date}</p>
              <p><span className="text-gray-400">時段：</span>{selectedSlot?.start_time.slice(0, 5)} – {selectedSlot?.end_time.slice(0, 5)}</p>
              {address_from && <p><span className="text-gray-400">地址：</span>{address_from}</p>}
              {isWaitlist && <p className="text-amber-600 font-medium mt-2">⚠️ 此為候補預約，有名額釋出將優先聯繫您</p>}
            </div>
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-800 text-left leading-relaxed">
              <p>感謝您的預約！</p>
              <p className="mt-1">我們已收到您的估價預約，將於 24 小時內以電話或 LINE 與您確認。</p>
              <p className="mt-1">如有緊急需求，請直接撥打 <strong>02-77550920</strong>。</p>
            </div>
            <button onClick={resetForm} className="mt-6 text-sm text-brand-600 hover:underline">再預約一個時段</button>
          </div>
        </div>
      </section>
    );
  }

  // ─── Main Calendar + Form ──────────────────────────────────────────────────────
  return (
    <section id="booking" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-brand-600 uppercase tracking-wide mb-2">FREE ESTIMATION</p>
          <h2 className="text-3xl font-bold text-gray-900">預約<span className="text-brand-500">到府估價</span></h2>
          <p className="text-gray-500 mt-3">選擇您方便的時段，我們將安排專業顧問到府評估</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ── Calendar ── */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ChevronLeft size={18} />
              </button>
              <h3 className="font-semibold text-gray-800">{year}年 {MONTHS[month]}</h3>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
              {Array(daysInMonth).fill(null).map((_, i) => {
                const d = i + 1;
                const ds = dateStr(d);
                const daySlots = slotsByDate[ds] ?? [];
                const availableSlots = daySlots.filter(s => getSlotStatus(s).available);
                const isPast = ds < today;
                const hasSlots = availableSlots.length > 0;
                const isSelected = selectedSlot?.date === ds;
                const isDateFiltered = selectedDateFilter === ds;
                return (
                  <button key={d} disabled={isPast || !hasSlots}
                    onClick={() => { setSelectedSlot(null); setSelectedDateFilter(ds); }}
                    className={`aspect-square rounded-xl text-sm flex flex-col items-center justify-center transition-all ${
                      isPast ? 'text-gray-200 cursor-not-allowed' :
                      isSelected ? 'bg-brand-500 text-white font-medium' :
                      isDateFiltered ? 'bg-brand-100 text-brand-700 font-medium ring-2 ring-brand-400' :
                      hasSlots ? 'hover:bg-brand-50 text-gray-700 font-medium' :
                      'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{d}</span>
                    {hasSlots && !isPast && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-brand-400'}`} />}
                  </button>
                );
              })}
            </div>

            {/* Slot List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {selectedDateFilter ? `${selectedDateFilter} 可預約時段` : '近期可預約時段'}
                </p>
                {selectedDateFilter && (
                  <button onClick={() => setSelectedDateFilter(null)}
                    className="text-xs text-brand-600 hover:underline">全部時段</button>
                )}
              </div>
              {(() => {
                const filteredSlots = selectedDateFilter
                  ? slots.filter(s => s.date === selectedDateFilter && getSlotStatus(s).available)
                  : slots.filter(s => getSlotStatus(s).available).slice(0, 3);
                return filteredSlots.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {selectedDateFilter ? '此日無可預約時段' : '目前無開放時段，請稍後再查詢'}
                  </p>
                ) : (
                  filteredSlots.map(slot => {
                    const status = getSlotStatus(slot);
                    return (
                      <button key={slot.id} onClick={() => handleSelectSlot(slot)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          selectedSlot?.id === slot.id
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedSlot?.id === slot.id ? 'bg-brand-500' : 'bg-gray-100'}`}>
                            <Calendar size={15} className={selectedSlot?.id === slot.id ? 'text-white' : 'text-gray-500'} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{slot.date}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={11} />{slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                            </p>
                          </div>
                        </div>
                        {status.isWaitlist ? (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">候補 {status.waitlistPos} 號</span>
                        ) : (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">剩 {status.remaining} 名</span>
                        )}
                      </button>
                    );
                  })
                );
              })()}
            </div>
          </div>

          {/* ── Booking Form ── */}
          <div className="bg-gray-50 rounded-3xl p-6">
            {step === 'calendar' ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Calendar size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm">請先在左方選擇預約時段</p>
              </div>
            ) : (
              <div>
                {isWaitlist && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
                    ⚠️ 此時段正式名額已滿，將為您登記候補。有名額釋出將優先聯繫您。
                  </div>
                )}

                {/* Selected Slot Badge */}
                <div className="bg-white rounded-2xl p-4 mb-5 flex items-center gap-3 border border-brand-200">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedSlot?.date}</p>
                    <p className="text-sm text-gray-500">{selectedSlot?.start_time.slice(0, 5)} – {selectedSlot?.end_time.slice(0, 5)}</p>
                  </div>
                  <button onClick={() => { setSelectedSlot(null); setStep('calendar'); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">更換</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">聯絡人姓名 *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                        required placeholder="王小明"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">聯絡電話 *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        required placeholder="0912345678"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">電子信箱</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        type="email" placeholder="（選填）client@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  {/* 舊址 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">舊址 *</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select value={form.city} onChange={e => setForm({ ...form, city: e.target.value, district: '' })}
                          required
                          className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none">
                          <option value="">選擇縣市 *</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <select value={form.district} onChange={e => setForm({ ...form, district: e.target.value })}
                        required disabled={!form.city}
                        className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 disabled:text-gray-400 appearance-none">
                        <option value="">選擇行政區 *</option>
                        {(TAIWAN_DISTRICTS[form.city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <input value={form.address_detail} onChange={e => setForm({ ...form, address_detail: e.target.value })}
                      required placeholder="詳細地址（路街巷弄號）"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>

                  {/* 新址 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">新址 *</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select value={form.to_city} onChange={e => setForm({ ...form, to_city: e.target.value, to_district: '' })}
                          required
                          className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none">
                          <option value="">選擇縣市 *</option>
                          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <select value={form.to_district} onChange={e => setForm({ ...form, to_district: e.target.value })}
                        required disabled={!form.to_city}
                        className="w-full px-3 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 disabled:text-gray-400 appearance-none">
                        <option value="">選擇行政區 *</option>
                        {(TAIWAN_DISTRICTS[form.to_city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <input value={form.to_detail} onChange={e => setForm({ ...form, to_detail: e.target.value })}
                      required placeholder="詳細地址（路街巷弄號）"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>

                  {/* 預計搬家日 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">預計搬家日</label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input type="date" value={form.moving_date}
                        onChange={e => setForm({ ...form, moving_date: e.target.value })}
                        min={today}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>

                  {/* 備註 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">備註</label>
                    <textarea value={form.notes} rows={3}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="（選填）任何想先告訴我們的需求，例如：樓層、是否有電梯、特殊物件、打包需求等"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                  <button type="submit" disabled={submitting}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-60 text-sm">
                    {submitting ? '預約中...' : isWaitlist ? '加入候補名單 →' : '確認預約 →'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">預約後若需要取消或修改預約時間，請直接於下方 查詢 / 修改預約 區修改</p>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ─── Lookup / Cancel Section ──────────────────────────────────────────────── */}
        <div className="mt-16 border-t border-gray-100 pt-12">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">查詢 / 修改預約</h3>
              <p className="text-sm text-gray-500 mt-1">輸入預約時的姓名與電話查詢您的預約記錄</p>
            </div>
            <form onSubmit={handleLookup} className="flex gap-2 mb-4 flex-wrap sm:flex-nowrap">
              <input value={lookupName} onChange={e => setLookupName(e.target.value)}
                placeholder="聯絡人姓名" required
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <input value={lookupPhone} onChange={e => setLookupPhone(e.target.value)}
                placeholder="聯絡電話" required
                className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              <button type="submit" disabled={lookupLoading}
                className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-all disabled:opacity-60 whitespace-nowrap">
                <Search size={15} />{lookupLoading ? '查詢中...' : '查詢'}
              </button>
            </form>
            {lookupError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 mb-4">{lookupError}</p>
            )}
            {lookupResults.length > 0 && (
              <div className="space-y-3">
                {lookupResults.map(b => (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="space-y-1 text-sm min-w-0">
                      <p className="font-medium text-gray-800">
                        {b.time_slots?.date ?? '未指定日期'}
                        {b.time_slots && <span className="text-gray-500">　{b.time_slots.start_time?.slice(0,5)} – {b.time_slots.end_time?.slice(0,5)}</span>}
                      </p>
                      <p className="text-gray-500 truncate">{b.address_from || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[b.status] ?? 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                      {b.status === '待確認' && (
                        <button onClick={() => handleCancel(b.id)} disabled={cancellingId === b.id}
                          className="flex items-center gap-1 text-xs text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all disabled:opacity-60">
                          <X size={12} />{cancellingId === b.id ? '取消中...' : '取消預約'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
