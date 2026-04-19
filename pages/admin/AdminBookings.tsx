import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, FileText, Phone, MapPin, Calendar, Edit2, X, Save, User, Trash2, Plus, Copy, Check } from 'lucide-react';
import { supabase, Booking, TimeSlot, Consultant, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TAIWAN_DISTRICTS, CITIES } from '../../lib/taiwanDistricts';
import { syncBookingToGcal } from '../../lib/gcalSync';

const STATUSES = ['全部', '待確認', '已確認', '進行中', '已完成', '已取消'];
const statusColor: Record<string, string> = {
  '待確認': 'bg-yellow-100 text-yellow-700',
  '已確認': 'bg-blue-100 text-blue-700',
  '進行中': 'bg-brand-100 text-brand-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-500',
};

interface EditForm {
  customer_name: string;
  phone: string;
  email: string;
  address_from: string;
  status: string;
  notes: string;
  assigned_consultant_id: string;
  time_slot_id: string;
}

export default function AdminBookings() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState<Consultant[]>([]);

  // Edit modal state
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  // 複製狀態（短暫顯示勾勾）
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 新增預約 modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSlots, setCreateSlots] = useState<TimeSlot[]>([]);
  const [createForm, setCreateForm] = useState({
    customer_name: '', phone: '', email: '',
    from_city: '', from_district: '', from_detail: '',
    to_city: '', to_district: '', to_detail: '',
    moving_date: '', notes: '',
    time_slot_id: '',
  });

  const fetchBookings = async () => {
    const { data } = await supabase
      .from(T.bookings)
      .select(`*, time_slots:${T.slots}(id, date, start_time, end_time), consultant:${T.consultants}(display_name)`)
      .order('created_at', { ascending: false });
    setBookings((data as any[]) ?? []);
    setFiltered((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
    supabase.from(T.consultants).select('*').eq('is_active', true).order('display_name')
      .then(({ data }) => setConsultants(data ?? []));
  }, []);

  useEffect(() => {
    let result = bookings;
    if (statusFilter !== '全部') result = result.filter(b => b.status === statusFilter);
    if (search) result = result.filter(b =>
      b.customer_name.includes(search) || b.phone.includes(search) || (b.address_from ?? '').includes(search)
    );
    setFiltered(result);
  }, [search, statusFilter, bookings]);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from(T.bookings).update({ status }).eq('id', id);
    syncBookingToGcal(id);
    fetchBookings();
  };

  const updateConsultant = async (id: string, consultantId: string) => {
    await supabase.from(T.bookings).update({ assigned_consultant_id: consultantId || null }).eq('id', id);
    syncBookingToGcal(id);
    fetchBookings();
  };

  const copyBooking = async (b: any) => {
    const slot = b.time_slots;
    const consultantName = b.consultant?.display_name ?? '未指派';
    const lines = [
      '【客戶預約單】',
      `姓名：${b.customer_name}`,
      `電話：${b.phone}`,
      b.email ? `Email：${b.email}` : '',
      b.address_from ? `舊址：${b.address_from}` : '',
      b.address_to ? `新址：${b.address_to}` : '',
      b.moving_date ? `預計搬家日：${b.moving_date}` : '',
      slot ? `到府估價時段：${slot.date} ${slot.start_time?.slice(0,5)}–${slot.end_time?.slice(0,5)}` : '',
      `狀態：${b.status}`,
      `指派顧問：${consultantName}`,
      b.notes ? `備註：${b.notes}` : '',
    ].filter(Boolean);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(b.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback：用舊 API
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(b.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // ── 新增預約 ────────────────────────────────────────────────────────────
  const openCreate = async () => {
    setShowCreate(true);
    setCreateError('');
    setCreateForm({
      customer_name: '', phone: '', email: '',
      from_city: '', from_district: '', from_detail: '',
      to_city: '', to_district: '', to_detail: '',
      moving_date: '', notes: '',
      time_slot_id: '',
    });
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from(T.slots)
      .select('*').eq('is_active', true).gte('date', today)
      .order('date').order('start_time');
    setCreateSlots(data ?? []);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError('');
    try {
      if (!createForm.customer_name.trim() || !createForm.phone.trim()) {
        throw new Error('姓名與電話為必填');
      }
      const address_from = [createForm.from_city, createForm.from_district, createForm.from_detail].filter(Boolean).join('');
      const address_to = [createForm.to_city, createForm.to_district, createForm.to_detail].filter(Boolean).join('');

      // 若有選時段，更新 current_bookings
      const slot = createSlots.find(s => s.id === createForm.time_slot_id);

      const { data: newBooking, error } = await supabase.from(T.bookings).insert({
        time_slot_id: createForm.time_slot_id || null,
        customer_name: createForm.customer_name.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        city: createForm.from_city || null,
        district: createForm.from_district || null,
        address_detail: createForm.from_detail || null,
        address_from: address_from || null,
        address_to_city: createForm.to_city || null,
        address_to_district: createForm.to_district || null,
        address_to_detail: createForm.to_detail || null,
        address_to: address_to || null,
        moving_date: createForm.moving_date || null,
        notes: createForm.notes || null,
        service_type: '到府估價',
        is_waitlist: false,
        status: '已確認',
      }).select('id').single();
      if (error) throw error;

      if (slot) {
        await supabase.from(T.slots)
          .update({ current_bookings: (slot.current_bookings ?? 0) + 1 })
          .eq('id', slot.id);
      }
      if (newBooking?.id) syncBookingToGcal(newBooking.id);
      await fetchBookings();
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message ?? '新增失敗');
    } finally {
      setCreateSaving(false);
    }
  };

  const deleteBooking = async (id: string, customerName: string) => {
    // 檢查是否有關聯的報價單
    const { data: linkedQuotes } = await supabase.from(T.quotes)
      .select('id, quote_number').eq('booking_id', id);
    const hasQuotes = (linkedQuotes?.length ?? 0) > 0;

    if (hasQuotes) {
      const quoteNumbers = linkedQuotes!.map(q => q.quote_number).join('、');
      const msg = `此筆預約單已建立報價單，請確認是否仍要刪除？\n\n關聯報價單：${quoteNumbers}\n\n（刪除後報價單仍保留，但不再連結到此預約單）`;
      if (!confirm(msg)) return;

      // 先解除關聯報價單的 booking_id
      const { error: unlinkErr } = await supabase.from(T.quotes)
        .update({ booking_id: null }).eq('booking_id', id);
      if (unlinkErr) {
        alert(`解除報價單關聯失敗：${unlinkErr.message}`);
        return;
      }
    } else {
      if (!confirm(`確定要刪除 ${customerName} 的預約單嗎？此動作無法復原。`)) return;
    }

    // 先通知 GCal 刪除（趁 booking 還在）
    await syncBookingToGcal(id, 'delete');

    const { error } = await supabase.from(T.bookings).delete().eq('id', id);
    if (error) {
      alert(`刪除失敗：${error.message}`);
    } else {
      fetchBookings();
    }
  };

  // Open edit modal
  const openEdit = async (booking: Booking) => {
    setEditingBooking(booking);
    setEditForm({
      customer_name: booking.customer_name,
      phone: booking.phone,
      email: booking.email ?? '',
      address_from: booking.address_from ?? '',
      status: booking.status,
      notes: booking.notes ?? '',
      assigned_consultant_id: booking.assigned_consultant_id ?? '',
      time_slot_id: booking.time_slot_id ?? '',
    });
    // Fetch available slots (today onwards)
    const today = new Date().toISOString().split('T')[0];
    const { data: slots } = await supabase.from(T.slots)
      .select('*')
      .gte('date', today)
      .eq('is_active', true)
      .order('date')
      .order('start_time');
    setAvailableSlots(slots ?? []);
  };

  const closeEdit = () => {
    setEditingBooking(null);
    setEditForm(null);
    setAvailableSlots([]);
  };

  const handleEditSave = async () => {
    if (!editingBooking || !editForm) return;
    setEditSaving(true);
    try {
      const oldSlotId = editingBooking.time_slot_id;
      const newSlotId = editForm.time_slot_id || null;
      const slotChanged = oldSlotId !== newSlotId;

      // Update booking fields
      await supabase.from(T.bookings).update({
        customer_name: editForm.customer_name,
        phone: editForm.phone,
        email: editForm.email || null,
        address_from: editForm.address_from || null,
        status: editForm.status,
        notes: editForm.notes || null,
        assigned_consultant_id: editForm.assigned_consultant_id || null,
        time_slot_id: newSlotId,
      }).eq('id', editingBooking.id);

      // Sync time slot booking counts if slot changed
      if (slotChanged) {
        // Decrement old slot
        if (oldSlotId) {
          const oldSlot = availableSlots.find(s => s.id === oldSlotId) ??
            (await supabase.from(T.slots).select('current_bookings').eq('id', oldSlotId).single()).data;
          if (oldSlot) {
            await supabase.from(T.slots)
              .update({ current_bookings: Math.max(0, (oldSlot.current_bookings ?? 1) - 1) })
              .eq('id', oldSlotId);
          }
        }
        // Increment new slot
        if (newSlotId) {
          const newSlot = availableSlots.find(s => s.id === newSlotId);
          if (newSlot) {
            await supabase.from(T.slots)
              .update({ current_bookings: (newSlot.current_bookings ?? 0) + 1 })
              .eq('id', newSlotId);
          }
        }
      }

      // Send email notification if time slot changed and booking has email
      if (slotChanged && editingBooking.email) {
        try {
          await supabase.functions.invoke('send-booking-email', {
            body: { booking_id: editingBooking.id, event_type: 'booking_modified' },
          });
        } catch (_) { /* non-fatal */ }
      }

      // 同步到 Google Calendar
      syncBookingToGcal(editingBooking.id);

      await fetchBookings();
      closeEdit();
    } catch (e: any) {
      alert(`儲存失敗：${e.message}`);
    } finally {
      setEditSaving(false);
    }
  };

  // Group available slots by date for the slot picker
  const slotsByDate = availableSlots.reduce((acc, s) => {
    acc[s.date] = acc[s.date] ?? [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, TimeSlot[]>);
  const slotDates = Object.keys(slotsByDate).sort();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">預約單管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {filtered.length} 筆記錄</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
          <Plus size={15} />新增預約
        </button>
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
                  {['客戶', '聯絡方式', '預約時段', '舊址 / 新址', '指派顧問', '狀態', '操作'].map(h => (
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
                      {(b as any).time_slots ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar size={13} />
                          {(b as any).time_slots.date} {(b as any).time_slots.start_time?.slice(0,5)}
                        </div>
                      ) : <span className="text-gray-400">未選時段</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 max-w-[220px]">
                        {b.address_from && (
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <span className="text-gray-400 flex-shrink-0">舊：</span>
                            <span className="truncate" title={b.address_from}>{b.address_from}</span>
                          </div>
                        )}
                        {(b as any).address_to && (
                          <div className="flex items-center gap-1 text-gray-600 text-xs">
                            <span className="text-gray-400 flex-shrink-0">新：</span>
                            <span className="truncate" title={(b as any).address_to}>{(b as any).address_to}</span>
                          </div>
                        )}
                        {(b as any).moving_date && (
                          <div className="text-xs text-gray-400">
                            搬家日 {(b as any).moving_date}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.assigned_consultant_id ?? ''}
                        onChange={e => updateConsultant(b.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white min-w-[100px]"
                      >
                        <option value="">未指派</option>
                        {consultants.map(c => (
                          <option key={c.id} value={c.id}>{c.display_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-brand-400 ${statusColor[b.status]}`}>
                        {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copyBooking(b)}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                            copiedId === b.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                          title="複製預約內容">
                          {copiedId === b.id ? <><Check size={12} />已複製</> : <><Copy size={12} />複製</>}
                        </button>
                        <button onClick={() => openEdit(b)}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Edit2 size={12} />編輯
                        </button>
                        <Link to={`/admin/quotes/new/${b.id}`}
                          className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors">
                          <FileText size={12} />報價
                        </Link>
                        {isAdmin && (
                          <button onClick={() => deleteBooking(b.id, b.customer_name)}
                            className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            title="刪除預約單（僅最高管理者）">
                            <Trash2 size={12} />刪除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBooking && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-800">編輯預約單</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editingBooking.customer_name}</p>
              </div>
              <button onClick={closeEdit} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Customer info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">客戶資訊</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">姓名</label>
                    <input value={editForm.customer_name}
                      onChange={e => setEditForm(f => f ? { ...f, customer_name: e.target.value } : f)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">電話</label>
                    <input value={editForm.phone}
                      onChange={e => setEditForm(f => f ? { ...f, phone: e.target.value } : f)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
                    <input value={editForm.email}
                      onChange={e => setEditForm(f => f ? { ...f, email: e.target.value } : f)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">地址</label>
                    <input value={editForm.address_from}
                      onChange={e => setEditForm(f => f ? { ...f, address_from: e.target.value } : f)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500 mb-1 block">備註</label>
                  <textarea value={editForm.notes} rows={2}
                    onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
                </div>
              </div>

              {/* Consultant assignment */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">指派估價顧問</h3>
                <select value={editForm.assigned_consultant_id}
                  onChange={e => setEditForm(f => f ? { ...f, assigned_consultant_id: e.target.value } : f)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="">未指派</option>
                  {consultants.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">預約狀態</h3>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.slice(1).map(s => (
                    <button key={s} type="button"
                      onClick={() => setEditForm(f => f ? { ...f, status: s } : f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        editForm.status === s
                          ? 'border-brand-500 bg-brand-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-brand-300'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot picker */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">更換預約時段</h3>
                <p className="text-xs text-gray-400 mb-3">
                  目前時段：{(editingBooking as any).time_slots
                    ? `${(editingBooking as any).time_slots.date} ${(editingBooking as any).time_slots.start_time?.slice(0,5)}–${(editingBooking as any).time_slots.end_time?.slice(0,5)}`
                    : '未選時段'}
                </p>
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-gray-400">目前無可用時段</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-3">
                    <button
                      onClick={() => setEditForm(f => f ? { ...f, time_slot_id: '' } : f)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                        editForm.time_slot_id === ''
                          ? 'bg-brand-500 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}>
                      不選時段
                    </button>
                    {slotDates.map(date => (
                      <div key={date}>
                        <p className="text-xs font-semibold text-gray-500 px-1 py-1 mt-2">{date}</p>
                        {slotsByDate[date].map(slot => {
                          const full = (slot.current_bookings ?? 0) >= slot.max_bookings;
                          return (
                            <button key={slot.id}
                              onClick={() => !full && setEditForm(f => f ? { ...f, time_slot_id: slot.id } : f)}
                              disabled={full}
                              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                                editForm.time_slot_id === slot.id
                                  ? 'bg-brand-500 text-white'
                                  : full
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-50'
                              }`}>
                              {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                              <span className="ml-2 text-xs opacity-70">
                                ({slot.current_bookings}/{slot.max_bookings}){full ? ' 已滿' : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6">
              <button onClick={closeEdit}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                取消
              </button>
              <button onClick={handleEditSave} disabled={editSaving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
                <Save size={15} />{editSaving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 新增預約 Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-800">新增預約</h2>
                <p className="text-xs text-gray-400 mt-0.5">由後台代客戶建立預約單</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              {/* 姓名 / 電話 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">姓名 *</label>
                  <input value={createForm.customer_name} required
                    onChange={e => setCreateForm({ ...createForm, customer_name: e.target.value })}
                    placeholder="王小明"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">電話 *</label>
                  <input value={createForm.phone} required
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>

              {/* Email（選填）*/}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email（選填）</label>
                <input type="email" value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              {/* 舊址 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">舊址</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={createForm.from_city}
                    onChange={e => setCreateForm({ ...createForm, from_city: e.target.value, from_district: '' })}
                    className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                    <option value="">縣市</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={createForm.from_district}
                    onChange={e => setCreateForm({ ...createForm, from_district: e.target.value })}
                    disabled={!createForm.from_city}
                    className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 bg-white">
                    <option value="">行政區</option>
                    {(TAIWAN_DISTRICTS[createForm.from_city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <input value={createForm.from_detail}
                  onChange={e => setCreateForm({ ...createForm, from_detail: e.target.value })}
                  placeholder="詳細地址"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              {/* 新址 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">新址</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select value={createForm.to_city}
                    onChange={e => setCreateForm({ ...createForm, to_city: e.target.value, to_district: '' })}
                    className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                    <option value="">縣市</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={createForm.to_district}
                    onChange={e => setCreateForm({ ...createForm, to_district: e.target.value })}
                    disabled={!createForm.to_city}
                    className="w-full px-2 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 bg-white">
                    <option value="">行政區</option>
                    {(TAIWAN_DISTRICTS[createForm.to_city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <input value={createForm.to_detail}
                  onChange={e => setCreateForm({ ...createForm, to_detail: e.target.value })}
                  placeholder="詳細地址"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              {/* 預計搬家日 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">預計搬家日</label>
                <input type="date" value={createForm.moving_date}
                  onChange={e => setCreateForm({ ...createForm, moving_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>

              {/* 預約時段（與行事曆連動）*/}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">到府估價時段（選填，與行事曆連動）</label>
                <select value={createForm.time_slot_id}
                  onChange={e => setCreateForm({ ...createForm, time_slot_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                  <option value="">不指定時段</option>
                  {createSlots.map(s => {
                    const full = (s.current_bookings ?? 0) >= s.max_bookings;
                    return (
                      <option key={s.id} value={s.id} disabled={full}>
                        {s.date} {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}
                        （{s.current_bookings ?? 0}/{s.max_bookings}）{full ? ' 已滿' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 備註 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">備註</label>
                <textarea value={createForm.notes} rows={3}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="（選填）"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{createError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">
                  取消
                </button>
                <button type="submit" disabled={createSaving}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl disabled:opacity-60">
                  <Plus size={15} />{createSaving ? '建立中...' : '建立預約'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
