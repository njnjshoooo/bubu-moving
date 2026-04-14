import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Eye, EyeOff, Calendar, Layers } from 'lucide-react';
import { supabase, TimeSlot, T } from '../../lib/supabase';

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const DOW_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

// ── 24h TimeInput component ───────────────────────────────────────────────────
const TimeInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const parts = (value || '09:00').split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const minuteOptions = [0, 15, 30, 45];
  const setH = (newH: number) => onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const setM = (newM: number) => onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  return (
    <div className={`inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-2 py-1.5 ${className}`}>
      <select value={h} onChange={e => setH(+e.target.value)}
        className="text-sm bg-transparent focus:outline-none cursor-pointer">
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="text-sm text-gray-400 select-none">:</span>
      <select value={m} onChange={e => setM(+e.target.value)}
        className="text-sm bg-transparent focus:outline-none cursor-pointer">
        {minuteOptions.map(v => (
          <option key={v} value={v}>{String(v).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
};

export default function AdminCalendar() {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [form, setForm] = useState({ start_time: '09:00', end_time: '12:00', max_bookings: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Batch add state
  const [batchDateFrom, setBatchDateFrom] = useState('');
  const [batchDateTo, setBatchDateTo] = useState('');
  const [batchDows, setBatchDows] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [batchStart, setBatchStart] = useState('09:00');
  const [batchEnd, setBatchEnd] = useState('12:00');
  const [batchMax, setBatchMax] = useState(1);
  const [batchSaving, setBatchSaving] = useState(false);

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

  // Batch add: compute preview dates
  const batchPreviewDates = (): string[] => {
    if (!batchDateFrom || !batchDateTo || batchDows.length === 0) return [];
    const result: string[] = [];
    const from = new Date(batchDateFrom);
    const to = new Date(batchDateTo);
    if (from > to) return [];
    const cur = new Date(from);
    while (cur <= to) {
      if (batchDows.includes(cur.getDay())) {
        result.push(cur.toISOString().split('T')[0]);
      }
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  };
  const previewDates = batchPreviewDates();

  const handleBatchAdd = async () => {
    if (previewDates.length === 0) return;
    setBatchSaving(true);
    const inserts = previewDates.map(date => ({
      date,
      start_time: batchStart,
      end_time: batchEnd,
      max_bookings: batchMax,
    }));
    // Insert in chunks of 50
    for (let i = 0; i < inserts.length; i += 50) {
      await supabase.from(T.slots).insert(inserts.slice(i, i + 50));
    }
    await fetchSlots();
    setBatchSaving(false);
    setShowBatch(false);
    // Reset
    setBatchDateFrom('');
    setBatchDateTo('');
    setBatchDows([1, 2, 3, 4, 5]);
  };

  const toggleDow = (dow: number) => {
    setBatchDows(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow].sort()
    );
  };

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">行事曆管理</h1>
          <p className="text-sm text-gray-500 mt-1">設定客戶可預約的估價時段</p>
        </div>
        <button
          onClick={() => { setShowBatch(!showBatch); setSelectedDate(null); }}
          className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl transition-all">
          <Layers size={15} />批量新增時段
        </button>
      </div>

      {/* Batch Add Panel */}
      {showBatch && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">批量新增時段</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">開始日期</label>
              <input type="date" value={batchDateFrom} onChange={e => setBatchDateFrom(e.target.value)}
                min={today}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">結束日期</label>
              <input type="date" value={batchDateTo} onChange={e => setBatchDateTo(e.target.value)}
                min={batchDateFrom || today}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">開始時間</label>
              <TimeInput value={batchStart} onChange={setBatchStart} className="w-full justify-center" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">結束時間</label>
              <TimeInput value={batchEnd} onChange={setBatchEnd} className="w-full justify-center" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">最大預約人數</label>
              <input type="number" min={1} max={20} value={batchMax}
                onChange={e => setBatchMax(+e.target.value)}
                className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">適用星期</label>
              <div className="flex gap-1.5">
                {DOW_LABELS.map((label, dow) => (
                  <button key={dow} type="button"
                    onClick={() => toggleDow(dow)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                      batchDows.includes(dow)
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            {previewDates.length === 0 ? (
              <p className="text-sm text-gray-400">請選擇日期範圍與星期篩選，以預覽將新增的日期</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">將新增 {previewDates.length} 個時段：</p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                  {previewDates.map(d => (
                    <span key={d} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg">{d}</span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleBatchAdd} disabled={batchSaving || previewDates.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
              <Plus size={15} />{batchSaving ? '新增中...' : `確認新增 ${previewDates.length > 0 ? previewDates.length + ' 個' : ''}`}
            </button>
            <button onClick={() => setShowBatch(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              取消
            </button>
          </div>
        </div>
      )}

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
                  onClick={() => { setSelectedDate(ds); setShowForm(false); setShowBatch(false); }}
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
                  className="flex items-center gap-1.5 text-sm bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg transition-all">
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
                      <TimeInput value={form.start_time} onChange={v => setForm({ ...form, start_time: v })} className="w-full justify-start" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">結束時間</label>
                      <TimeInput value={form.end_time} onChange={v => setForm({ ...form, end_time: v })} className="w-full justify-start" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">最大預約人數</label>
                    <input type="number" min={1} max={10} value={form.max_bookings}
                      onChange={e => setForm({ ...form, max_bookings: +e.target.value })}
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
