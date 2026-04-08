import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { supabase, TimeSlot, T } from '../../lib/supabase';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function AdminCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ start_time: '09:00', end_time: '12:00', max_bookings: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSlots = async () => {
    const { data } = await supabase.from(T.slots).select('*').order('date').order('start_time');
    setSlots(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSlots(); }, []);

  // Calendar grid
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

  const handleAddSlot = async () => {
    if (!selectedDate) return;
    setSaving(true);
    await supabase.from(T.slots).insert({
      date: selectedDate,
      start_time: form.start_time,
      end_time: form.end_time,
      max_bookings: form.max_bookings,
    });
    await fetchSlots();
    setSaving(false);
    setShowForm(false);
  };

  const handleToggle = async (slot: TimeSlot) => {
    await supabase.from(T.slots).update({ is_active: !slot.is_active }).eq('id', slot.id);
    await fetchSlots();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此時段嗎？')) return;
    await supabase.from(T.slots).delete().eq('id', id);
    await fetchSlots();
  };

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">行事曆管理</h1>
          <p className="text-sm text-gray-500 mt-1">設定客戶可預約的估價時段</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-gray-800">{year}年 {MONTHS[month]}</h2>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const d = i + 1;
              const ds = dateStr(d);
              const daySlots = slotsByDate[ds] ?? [];
              const isSelected = ds === selectedDate;
              const isPast = ds < today;
              return (
                <button
                  key={d}
                  onClick={() => { setSelectedDate(ds); setShowForm(false); }}
                  className={`relative p-1 rounded-xl text-sm transition-all aspect-square flex flex-col items-center justify-start pt-1.5 ${
                    isSelected ? 'bg-brand-500 text-white' :
                    isPast ? 'text-gray-300 cursor-default' :
                    'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span>{d}</span>
                  {daySlots.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {daySlots.slice(0, 3).map(s => (
                        <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${s.is_active ? (isSelected ? 'bg-white' : 'bg-brand-400') : 'bg-gray-300'}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {selectedDate ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">{selectedDate}</h3>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-all"
                >
                  <Plus size={14} />
                  新增時段
                </button>
              </div>

              {/* Add form */}
              {showForm && (
                <div className="bg-brand-50 rounded-xl p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">開始時間</label>
                      <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">結束時間</label>
                      <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">最大預約人數</label>
                    <input type="number" min={1} max={10} value={form.max_bookings} onChange={e => setForm({ ...form, max_bookings: +e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddSlot} disabled={saving}
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm py-2 rounded-lg transition-all disabled:opacity-60">
                      {saving ? '儲存中...' : '確認新增'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                  </div>
                </div>
              )}

              {/* Slots list */}
              {selectedSlots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">此日尚無時段</p>
              ) : (
                <div className="space-y-2">
                  {selectedSlots.map(slot => (
                    <div key={slot.id} className={`flex items-center justify-between p-3 rounded-xl border ${slot.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}</p>
                        <p className="text-xs text-gray-500">{slot.current_bookings}/{slot.max_bookings} 已預約</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggle(slot)} title={slot.is_active ? '停用' : '啟用'}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors">
                          {slot.is_active ? <Eye size={15} className="text-green-600" /> : <EyeOff size={15} className="text-gray-400" />}
                        </button>
                        <button onClick={() => handleDelete(slot.id)} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <Calendar size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">點選日期以管理時段</p>
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">說明</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-brand-400" />開放中時段
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-gray-300" />已停用時段
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
