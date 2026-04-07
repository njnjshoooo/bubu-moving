import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, Phone, MapPin, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase, TimeSlot } from '../lib/supabase';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function BookingCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState({ customer_name: '', phone: '', address_from: '' });
  const [step, setStep] = useState<'calendar' | 'form' | 'success'>('calendar');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    supabase.from('time_slots').select('*')
      .eq('is_active', true)
      .gte('date', today)
      .order('date').order('start_time')
      .then(({ data }) => setSlots(data ?? []));
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  const slotsByDate = slots.reduce((acc, s) => {
    acc[s.date] = acc[s.date] ?? [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.from('bookings').insert({
      time_slot_id: selectedSlot.id,
      customer_name: form.customer_name,
      phone: form.phone,
      address_from: form.address_from,
      service_type: '到府估價',
    });
    if (err) {
      setError('預約失敗，請稍後再試或致電我們。');
      setSubmitting(false);
      return;
    }
    // Increment slot bookings
    await supabase.from('time_slots')
      .update({ current_bookings: selectedSlot.current_bookings + 1 })
      .eq('id', selectedSlot.id);
    setStep('success');
    setSubmitting(false);
  };

  if (step === 'success') {
    return (
      <section id="booking" className="py-16 bg-brand-50">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-3xl shadow-sm p-10">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-500" size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">預約成功！</h3>
            <p className="text-gray-500 mb-2">
              <strong>{form.customer_name}</strong> 您好，您已成功預約：
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-6 space-y-1">
              <p><span className="text-gray-400">日期：</span>{selectedSlot?.date}</p>
              <p><span className="text-gray-400">時段：</span>{selectedSlot?.start_time.slice(0,5)} – {selectedSlot?.end_time.slice(0,5)}</p>
              <p><span className="text-gray-400">地址：</span>{form.address_from}</p>
            </div>
            <p className="text-sm text-gray-400">我們的顧問將在 24 小時內與您電話確認。</p>
            <button onClick={() => { setStep('calendar'); setSelectedSlot(null); setForm({ customer_name: '', phone: '', address_from: '' }); }}
              className="mt-6 text-sm text-brand-600 hover:underline">再預約一個時段</button>
          </div>
        </div>
      </section>
    );
  }

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
          {/* Calendar */}
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
                const availableSlots = daySlots.filter(s => s.current_bookings < s.max_bookings);
                const isPast = ds < today;
                const hasSlots = availableSlots.length > 0;
                const isSelected = selectedSlot?.date === ds;
                return (
                  <button key={d} disabled={isPast || !hasSlots}
                    onClick={() => { setSelectedSlot(null); }}
                    className={`aspect-square rounded-xl text-sm flex flex-col items-center justify-center transition-all ${
                      isPast ? 'text-gray-200 cursor-not-allowed' :
                      isSelected ? 'bg-brand-500 text-white font-medium' :
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

            {/* Available Slots */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">可預約時段</p>
              {slots.filter(s => s.current_bookings < s.max_bookings).slice(0, 6).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">目前無開放時段，請稍後再查詢</p>
              ) : (
                slots.filter(s => s.current_bookings < s.max_bookings).slice(0, 8).map(slot => (
                  <button key={slot.id} onClick={() => { setSelectedSlot(slot); setStep('form'); }}
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
                          <Clock size={11} />{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      剩 {slot.max_bookings - slot.current_bookings} 名
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Form */}
          <div className="bg-gray-50 rounded-3xl p-6">
            {step === 'calendar' ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Calendar size={48} className="text-gray-200 mb-4" />
                <p className="text-gray-400 text-sm">請先在左方選擇預約時段</p>
              </div>
            ) : (
              <div>
                <div className="bg-white rounded-2xl p-4 mb-5 flex items-center gap-3 border border-brand-200">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Calendar size={18} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedSlot?.date}</p>
                    <p className="text-sm text-gray-500">{selectedSlot?.start_time.slice(0,5)} – {selectedSlot?.end_time.slice(0,5)}</p>
                  </div>
                  <button onClick={() => { setSelectedSlot(null); setStep('calendar'); }} className="ml-auto text-xs text-gray-400 hover:text-gray-600">更換</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">聯絡人姓名 *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                        required placeholder="王小明"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">聯絡電話 *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        required placeholder="0912-345-678"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">估價地址 *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={form.address_from} onChange={e => setForm({ ...form, address_from: e.target.value })}
                        required placeholder="台北市中正區..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

                  <button type="submit" disabled={submitting}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-60 text-sm">
                    {submitting ? '預約中...' : '確認預約 →'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">預約後我們將在 24 小時內電話確認</p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
