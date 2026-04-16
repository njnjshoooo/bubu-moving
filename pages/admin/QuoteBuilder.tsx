import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, ArrowLeft, Users, CalendarDays, UserCircle, CheckSquare, Square, AlignLeft, MapPin } from 'lucide-react';
import { supabase, NoteTemplate, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TAIWAN_DISTRICTS, CITIES } from '../../lib/taiwanDistricts';

// ─── Address parse helper ────────────────────────────────────────────────────
function parseAddress(addr: string): { city: string; district: string; detail: string } {
  if (!addr) return { city: '', district: '', detail: '' };
  for (const city of CITIES) {
    if (addr.startsWith(city)) {
      const rest = addr.slice(city.length);
      for (const district of TAIWAN_DISTRICTS[city] ?? []) {
        if (rest.startsWith(district)) {
          return { city, district, detail: rest.slice(district.length) };
        }
      }
      return { city, district: '', detail: rest };
    }
  }
  return { city: '', district: '', detail: addr };
}

// ─── Product Catalog ──────────────────────────────────────────────────────────
const PRODUCT_CATALOG: Record<string, { name: string; price: number }[]> = {
  '搬家車趟費': [
    { name: '搬家車資（3.5噸）', price: 3500 },
    { name: '家具封膜費', price: 2000 },
    { name: '床組拆裝費', price: 800 },
    { name: '鐵架拆裝費', price: 0 },
    { name: '廢棄物清運', price: 11000 },
    { name: '另址搬運費', price: 600 },
    { name: '鋼琴搬運', price: 0 },
    { name: '冰箱交換費', price: 1800 },
  ],
  '計時人員': [
    { name: '搬工', price: 1900 },
    { name: '整聊師', price: 600 },
  ],
  '包材費': [
    { name: '大紙箱', price: 80 },
    { name: '小紙箱', price: 55 },
    { name: '土報紙', price: 190 },
    { name: '工業膠膜（伸縮膜）', price: 600 },
    { name: '床墊套', price: 250 },
    { name: '透明封箱膠帶', price: 30 },
    { name: '小氣泡紙', price: 480 },
    { name: '大氣泡紙', price: 90 },
    { name: '掛衣箱', price: 700 },
    { name: '乾燥包', price: 0 },
    { name: '包材配送費', price: 2000 },
  ],
};

const CATEGORIES = Object.keys(PRODUCT_CATALOG) as Array<keyof typeof PRODUCT_CATALOG>;
const SCHEDULE_CATEGORIES = ['搬運', '整理', '清潔', '其他'];
const BREAK_OPTIONS = [0, 0.5, 1, 1.5, 2];

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id?: string;
  category: string;
  name: string;
  unit_price: number;
  quantity: number;
  sort_order: number;
}

interface StaffItemForm {
  id?: string;
  item_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_hours: number;
  person_count: number;
  unit_price: number;
}

interface ScheduleItemForm {
  id?: string;
  work_date: string;
  start_time: string;
  end_time: string;
  label: string;
  category: string;
}

interface QuoteForm {
  customer_name: string;
  phone: string;
  email: string;
  tax_id: string;
  company_name: string;
  address_from: string;
  address_from_type: string;
  address_from_parking: string;
  address_from_basement: string;
  address_from_guard: string;
  address_to: string;
  address_to_type: string;
  address_to_parking: string;
  address_to_basement: string;
  address_to_guard: string;
  consultant_name: string;
  consultant_phone: string;
  internal_notes: string;
  payment_link: string;
  payment_status: string;
}

// ─── 24h Time Input Component ─────────────────────────────────────────────────
const TimeInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  className?: string;
}> = ({ value, onChange, className = '' }) => {
  const parts = (value || '00:00').split(':');
  const h = parseInt(parts[0]) || 0;
  const m = parseInt(parts[1]) || 0;
  const validMinutes = [0, 15, 30, 45];
  // Ensure m is in valid range, otherwise add it to the list
  const minuteOptions = validMinutes.includes(m) ? validMinutes : [...validMinutes, m].sort((a, b) => a - b);

  const setH = (newH: number) =>
    onChange(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const setM = (newM: number) =>
    onChange(`${String(h).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);

  return (
    <div className={`inline-flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-1.5 py-1 ${className}`}>
      <select value={h} onChange={e => setH(+e.target.value)}
        className="text-xs bg-transparent focus:outline-none cursor-pointer">
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
        ))}
      </select>
      <span className="text-xs text-gray-400 select-none">:</span>
      <select value={m} onChange={e => setM(+e.target.value)}
        className="text-xs bg-transparent focus:outline-none cursor-pointer">
        {minuteOptions.map(v => (
          <option key={v} value={v}>{String(v).padStart(2, '0')}</option>
        ))}
      </select>
    </div>
  );
};

// ─── Numeric Input Helper ────────────────────────────────────────────────────
const numericInputProps = (value: number, onChange: (v: number) => void, min = 0) => ({
  type: 'text' as const,
  inputMode: 'numeric' as const,
  value: value === 0 ? '' : String(value),
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^\d]/g, '');
    onChange(Math.max(min, parseInt(cleaned) || 0));
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
    if (!e.target.value || parseInt(e.target.value) < min) onChange(min);
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcHours = (start: string, end: string, breakHours = 0): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60 - breakHours);
};

const staffSubtotal = (items: StaffItemForm[]) =>
  items.reduce((sum, i) => sum + calcHours(i.start_time, i.end_time, i.break_hours) * i.person_count * i.unit_price, 0);

const TODAY = new Date().toISOString().split('T')[0];

// ─── Save Toast ───────────────────────────────────────────────────────────────
const SaveToast: React.FC<{ status: 'success' | 'error' | null }> = ({ status }) => {
  if (!status) return null;
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all ${
      status === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {status === 'success' ? '✓ 儲存完成' : '✕ 尚未儲存，請再試一次'}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function QuoteBuilder() {
  const { bookingId, quoteId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [form, setForm] = useState<QuoteForm>({
    customer_name: '', phone: '', email: '', tax_id: '',
    company_name: '',
    address_from: '', address_from_type: '', address_from_parking: '', address_from_basement: '', address_from_guard: '',
    address_to: '', address_to_type: '', address_to_parking: '', address_to_basement: '', address_to_guard: '',
    consultant_name: '', consultant_phone: '', internal_notes: '',
    payment_link: '', payment_status: '',
  });
  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [staffItems, setStaffItems] = useState<StaffItemForm[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemForm[]>([]);
  const [notes, setNotes] = useState<NoteTemplate[]>([]);
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());
  const [remarkNotes, setRemarkNotes] = useState<string[]>([]);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    '搬家車趟費': true, _staff: true, _schedule: true, '計時人員': true,
  });
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('草稿');
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);

  // Address parts state (city/district/detail for from and to)
  const [addrFromCity, setAddrFromCity] = useState('');
  const [addrFromDistrict, setAddrFromDistrict] = useState('');
  const [addrFromDetail, setAddrFromDetail] = useState('');
  const [addrToCity, setAddrToCity] = useState('');
  const [addrToDistrict, setAddrToDistrict] = useState('');
  const [addrToDetail, setAddrToDetail] = useState('');

  // Custom item inline form state: { category, name, price, qty }
  const [customForm, setCustomForm] = useState<{ category: string; name: string; price: string; qty: string } | null>(null);
  // Custom staff item form state (for 計時人員 +自訂)
  const [customStaffForm, setCustomStaffForm] = useState<{ name: string; price: string } | null>(null);

  // Drag-and-drop refs
  const dragStaffIdx = useRef<number | null>(null);
  const dragSchedIdx = useRef<number | null>(null);

  useEffect(() => {
    supabase.from(T.noteTemplates).select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setNotes(data ?? []));
  }, []);

  useEffect(() => {
    if (bookingId) {
      supabase.from(T.bookings).select('*').eq('id', bookingId).single()
        .then(({ data }) => {
          if (data) {
            const parsed = parseAddress(data.address_from ?? '');
            setAddrFromCity(parsed.city);
            setAddrFromDistrict(parsed.district);
            setAddrFromDetail(parsed.detail);
            setForm(f => ({
              ...f,
              customer_name: data.customer_name,
              phone: data.phone,
              email: data.email ?? '',
              address_from: data.address_from ?? '',
            }));
          }
        });
    }
  }, [bookingId]);

  useEffect(() => {
    if (quoteId || !profile) return;
    supabase.from(T.consultants).select('display_name, phone')
      .eq('user_id', profile.id).eq('is_active', true).maybeSingle()
      .then(({ data }) => {
        const name = data?.display_name ?? profile.display_name ?? '';
        const phone = data?.phone ?? profile.phone ?? '';
        if (name) setForm(f => ({ ...f, consultant_name: name, consultant_phone: phone }));
      });
  }, [quoteId, profile]);

  useEffect(() => {
    if (!quoteId) {
      const now = new Date();
      setQuoteNumber(`QUO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`);
      return;
    }
    const load = async () => {
      const { data } = await supabase.from(T.quotes)
        .select(`*, quote_items:${T.quoteItems}(*), quote_checked_notes:${T.checkedNotes}(note_id)`)
        .eq('id', quoteId).single();
      if (!data) return;
      setExistingQuoteId(data.id);
      setQuoteNumber(data.quote_number);
      setQuoteStatus(data.status);
      setDeposit(data.deposit ?? 0);
      setDiscount(data.discount ?? 0);
      setForm({
        customer_name: data.customer_name, phone: data.phone,
        email: data.email ?? '', tax_id: data.tax_id ?? '',
        company_name: data.company_name ?? '',
        address_from: data.address_from ?? '',
        address_from_type: data.address_from_type ?? '', address_from_parking: data.address_from_parking ?? '',
        address_from_basement: data.address_from_basement ?? '', address_from_guard: data.address_from_guard ?? '',
        address_to: data.address_to ?? '',
        address_to_type: data.address_to_type ?? '', address_to_parking: data.address_to_parking ?? '',
        address_to_basement: data.address_to_basement ?? '', address_to_guard: data.address_to_guard ?? '',
        consultant_name: data.consultant_name ?? '',
        consultant_phone: data.consultant_phone ?? '',
        internal_notes: data.internal_notes ?? '',
        payment_link: data.payment_link ?? '',
        payment_status: data.payment_status ?? '',
      });
      // Parse existing addresses into city/district/detail parts
      const pFrom = parseAddress(data.address_from ?? '');
      setAddrFromCity(pFrom.city);
      setAddrFromDistrict(pFrom.district);
      setAddrFromDetail(pFrom.detail);
      const pTo = parseAddress(data.address_to ?? '');
      setAddrToCity(pTo.city);
      setAddrToDistrict(pTo.district);
      setAddrToDetail(pTo.detail);
      // Load remark_notes (stored as JSON array string)
      try {
        const parsed = JSON.parse(data.remark_notes ?? '[]');
        setRemarkNotes(Array.isArray(parsed) ? parsed : []);
      } catch { setRemarkNotes([]); }

      setItems((data.quote_items ?? []).map((item: any) => ({
        id: item.id, category: item.category, name: item.name,
        unit_price: item.unit_price, quantity: item.quantity, sort_order: item.sort_order,
      })));
      setCheckedNotes(new Set((data.quote_checked_notes ?? []).map((n: any) => n.note_id)));

      const { data: staffData } = await supabase.from(T.staffSchedule)
        .select('*').eq('quote_id', quoteId).order('sort_order');
      if (staffData) setStaffItems(staffData.map((s: any) => ({
        id: s.id,
        item_name: s.item_name ?? '整聊師',
        work_date: s.work_date,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
        break_hours: s.break_hours ?? 0,
        person_count: s.person_count,
        unit_price: s.unit_price,
      })));

      const { data: schedData } = await supabase.from(T.quoteSchedule)
        .select('*').eq('quote_id', quoteId).order('sort_order');
      if (schedData) setScheduleItems(schedData.map((s: any) => ({
        id: s.id, work_date: s.work_date, start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5), label: s.label, category: s.category,
      })));
    };
    load();
  }, [quoteId]);

  // ── Line Items ───────────────────────────────────────────────────────────────
  const addItem = (category: string, productName: string, price: number) => {
    // 計時人員 chips add staff schedule entries, not line items
    if (category === '計時人員') {
      addStaffItem(productName, price);
      return;
    }
    const existing = items.findIndex(i => i.category === category && i.name === productName);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setItems(prev => [...prev, { category, name: productName, unit_price: price, quantity: 1, sort_order: prev.length }]);
    }
  };

  const addCustomItem = () => {
    if (!customForm) return;
    const price = parseFloat(customForm.price) || 0;
    const qty = parseInt(customForm.qty) || 1;
    setItems(prev => [...prev, {
      category: customForm.category, name: customForm.name || '自訂品項',
      unit_price: price, quantity: qty, sort_order: prev.length,
    }]);
    setCustomForm(null);
  };

  const updateItem = (idx: number, field: 'quantity' | 'unit_price' | 'name', value: number | string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const toggleNote = (id: string) => setCheckedNotes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllNotes = () => {
    if (checkedNotes.size === notes.length) {
      setCheckedNotes(new Set());
    } else {
      setCheckedNotes(new Set(notes.map(n => n.id)));
    }
  };

  // ── Staff Items ──────────────────────────────────────────────────────────────
  const addStaffItem = (itemName = '整聊師', defaultPrice = 600) =>
    setStaffItems(prev => [...prev, {
      item_name: itemName,
      work_date: TODAY, start_time: '09:00', end_time: '17:00',
      break_hours: 0, person_count: 2, unit_price: defaultPrice,
    }]);

  const updateStaffItem = (idx: number, field: keyof StaffItemForm, value: string | number) =>
    setStaffItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const removeStaffItem = (idx: number) => setStaffItems(prev => prev.filter((_, i) => i !== idx));

  const handleStaffDragStart = (idx: number) => { dragStaffIdx.current = idx; };
  const handleStaffDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragStaffIdx.current === null || dragStaffIdx.current === idx) return;
    const next = [...staffItems];
    const [moved] = next.splice(dragStaffIdx.current!, 1);
    next.splice(idx, 0, moved);
    dragStaffIdx.current = idx;
    setStaffItems(next);
  };

  // ── Schedule Items ───────────────────────────────────────────────────────────
  const addScheduleItem = () => setScheduleItems(prev => [...prev, {
    work_date: TODAY, start_time: '09:00', end_time: '10:00', label: '', category: '搬家',
  }]);
  const updateScheduleItem = (idx: number, field: keyof ScheduleItemForm, value: string) =>
    setScheduleItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const removeScheduleItem = (idx: number) => setScheduleItems(prev => prev.filter((_, i) => i !== idx));

  const handleSchedDragStart = (idx: number) => { dragSchedIdx.current = idx; };
  const handleSchedDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSchedIdx.current === null || dragSchedIdx.current === idx) return;
    const next = [...scheduleItems];
    const [moved] = next.splice(dragSchedIdx.current, 1);
    next.splice(idx, 0, moved);
    dragSchedIdx.current = idx;
    setScheduleItems(next);
  };

  // ── Remark Notes ──────────────────────────────────────────────────────────────
  const addRemarkNote = () => setRemarkNotes(prev => [...prev, '']);
  const updateRemarkNote = (idx: number, val: string) =>
    setRemarkNotes(prev => prev.map((n, i) => i === idx ? val : n));
  const removeRemarkNote = (idx: number) =>
    setRemarkNotes(prev => prev.filter((_, i) => i !== idx));

  // ── Subtotals ─────────────────────────────────────────────────────────────────
  // 計時人員 costs come from staffItems only (not line items)
  const lineItemSubtotal = items
    .filter(i => i.category !== '計時人員')
    .reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const staffTotal = staffSubtotal(staffItems);
  const subtotal = lineItemSubtotal + staffTotal;
  const discountedTotal = Math.max(0, subtotal - discount);
  const balance = Math.max(0, discountedTotal - deposit);

  const catItems = (cat: string) => items.filter(i => i.category === cat);
  const catTotal = (cat: string) => {
    if (cat === '計時人員') return Math.round(staffTotal);
    return catItems(cat).reduce((s, i) => s + i.unit_price * i.quantity, 0);
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const showToast = (status: 'success' | 'error') => {
    setSaveStatus(status);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSave = async (redirectToView = false) => {
    setSaving(true);
    try {
      let consultantId: string | null = null;
      if (profile && profile.role === 'consultant') {
        const { data: cData } = await supabase.from(T.consultants)
          .select('id').eq('user_id', profile.id).maybeSingle();
        consultantId = cData?.id ?? null;
      }

      const quoteData = {
        quote_number: quoteNumber, booking_id: bookingId ?? null,
        ...form, subtotal, discount, total: discountedTotal, deposit,
        consultant_id: consultantId,
        remark_notes: JSON.stringify(remarkNotes.filter(n => n.trim())),
        status: (quoteStatus === '草稿' ? '草稿' : quoteStatus) as any,
      };
      let qid = existingQuoteId;
      if (qid) {
        const { error: upErr } = await supabase.from(T.quotes).update(quoteData).eq('id', qid);
        if (upErr) throw upErr;
        await supabase.from(T.quoteItems).delete().eq('quote_id', qid);
        await supabase.from(T.checkedNotes).delete().eq('quote_id', qid);
        await supabase.from(T.staffSchedule).delete().eq('quote_id', qid);
        await supabase.from(T.quoteSchedule).delete().eq('quote_id', qid);
      } else {
        const { data, error: insErr } = await supabase.from(T.quotes).insert(quoteData).select().single();
        if (insErr) throw insErr;
        qid = data?.id;
        setExistingQuoteId(qid ?? null);
      }
      // Save line items (exclude 計時人員 items – cost is in staffSchedule)
      const lineItemsToSave = items.filter(i => i.category !== '計時人員');
      if (qid && lineItemsToSave.length > 0) {
        const { error: e } = await supabase.from(T.quoteItems).insert(lineItemsToSave.map((item, idx) => ({
          quote_id: qid, category: item.category, name: item.name,
          unit_price: item.unit_price, quantity: item.quantity, sort_order: idx,
        })));
        if (e) throw e;
      }
      if (qid && staffItems.length > 0) {
        const { error: e } = await supabase.from(T.staffSchedule).insert(staffItems.map((s, idx) => ({
          quote_id: qid, item_name: s.item_name, work_date: s.work_date,
          start_time: s.start_time, end_time: s.end_time,
          break_hours: s.break_hours, person_count: s.person_count,
          unit_price: s.unit_price, sort_order: idx,
        })));
        if (e) throw e;
      }
      if (qid && scheduleItems.length > 0) {
        const { error: e } = await supabase.from(T.quoteSchedule).insert(scheduleItems.map((s, idx) => ({
          quote_id: qid, work_date: s.work_date, start_time: s.start_time,
          end_time: s.end_time, label: s.label, category: s.category, sort_order: idx,
        })));
        if (e) throw e;
      }
      if (qid && checkedNotes.size > 0) {
        const { error: e } = await supabase.from(T.checkedNotes).insert(
          Array.from(checkedNotes).map(nid => ({ quote_id: qid, note_id: nid }))
        );
        if (e) throw e;
      }
      showToast('success');
      if (redirectToView && qid) navigate(`/admin/quotes/${qid}/view`);
    } catch (err: any) {
      showToast('error');
      const msg: string = err?.message ?? err?.details ?? JSON.stringify(err);
      console.error('儲存失敗：', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <SaveToast status={saveStatus} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/quotes" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{existingQuoteId ? '編輯報價單' : '新增報價單'}</h1>
            <p className="text-sm text-gray-400 font-mono mt-0.5">{quoteNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm rounded-xl transition-all disabled:opacity-60">
            <Save size={15} />儲存
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
            <Eye size={15} />預覽 / 產出報價單
          </button>
        </div>
      </div>

      {/* ── Consultant Bar ── */}
      <div className="bg-white rounded-2xl border border-brand-100 px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-brand-600 flex-shrink-0">
          <UserCircle size={18} />
          <span className="text-sm font-semibold">服務顧問</span>
        </div>
        <div className="flex gap-3 flex-1 flex-wrap">
          <input value={form.consultant_name} onChange={e => setForm({ ...form, consultant_name: e.target.value })}
            placeholder="顧問姓名（自動帶入，可修改）"
            className="flex-1 min-w-36 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
          <input value={form.consultant_phone} onChange={e => setForm({ ...form, consultant_phone: e.target.value })}
            placeholder="聯繫方式（電話 / LINE）"
            className="flex-1 min-w-36 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Left Column ── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">客戶資訊</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { field: 'customer_name', label: '客戶姓名 *', placeholder: '王小明' },
                { field: 'phone', label: '聯絡電話 *', placeholder: '0912-345-678' },
                { field: 'email', label: 'E-mail（發送報價單用）', placeholder: 'client@example.com' },
                { field: 'tax_id', label: '統一編號', placeholder: '（選填）' },
                { field: 'company_name', label: '公司抬頭', placeholder: '（選填）' },
              ].map(({ field, label, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                  <input value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              ))}
            </div>
            {/* Address blocks */}
            {(['from', 'to'] as const).map(side => {
              const addrKey = `address_${side}` as const;
              const label = side === 'from' ? '搬遷地址' : '搬入地址';
              const typeKey = `address_${side}_type` as keyof QuoteForm;
              const parkingKey = `address_${side}_parking` as keyof QuoteForm;
              const basementKey = `address_${side}_basement` as keyof QuoteForm;
              const guardKey = `address_${side}_guard` as keyof QuoteForm;
              const city = side === 'from' ? addrFromCity : addrToCity;
              const district = side === 'from' ? addrFromDistrict : addrToDistrict;
              const detail = side === 'from' ? addrFromDetail : addrToDetail;
              const setCity = side === 'from' ? setAddrFromCity : setAddrToCity;
              const setDistrict = side === 'from' ? setAddrFromDistrict : setAddrToDistrict;
              const setDetail = side === 'from' ? setAddrFromDetail : setAddrToDetail;
              const composeAddr = (c: string, d: string, det: string) =>
                [c, d, det].filter(Boolean).join('');
              return (
                <div key={side} className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
                  {/* City / District selectors */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <select value={city}
                        onChange={e => {
                          const c = e.target.value;
                          setCity(c); setDistrict('');
                          setForm(f => ({ ...f, [addrKey]: composeAddr(c, '', detail) }));
                        }}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none bg-white">
                        <option value="">選擇縣市</option>
                        {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <select value={district}
                      onChange={e => {
                        const d = e.target.value;
                        setDistrict(d);
                        setForm(f => ({ ...f, [addrKey]: composeAddr(city, d, detail) }));
                      }}
                      disabled={!city}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-gray-100 disabled:text-gray-400 appearance-none bg-white">
                      <option value="">選擇行政區</option>
                      {(TAIWAN_DISTRICTS[city] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <input value={detail}
                    onChange={e => {
                      const det = e.target.value;
                      setDetail(det);
                      setForm(f => ({ ...f, [addrKey]: composeAddr(city, district, det) }));
                    }}
                    placeholder="詳細地址（路街巷弄號）"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-3" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">建築類型</p>
                      <div className="flex gap-2 flex-wrap">
                        {['電梯大樓', '1F、樓梯'].map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setForm(f => ({ ...f, [typeKey]: opt }))}
                            className={`px-3 py-1 rounded-lg text-xs border transition-all ${form[typeKey] === opt ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">是否有臨停區</p>
                      <div className="flex gap-2">
                        {['是', '否'].map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setForm(f => ({ ...f, [parkingKey]: opt }))}
                            className={`px-3 py-1 rounded-lg text-xs border transition-all ${form[parkingKey] === opt ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">地下室高度（選填）</p>
                      <input value={form[basementKey]} onChange={e => setForm(f => ({ ...f, [basementKey]: e.target.value }))}
                        placeholder="例：2.1m"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">是否有管理室</p>
                      <div className="flex gap-2">
                        {['是', '否'].map(opt => (
                          <button key={opt} type="button"
                            onClick={() => setForm(f => ({ ...f, [guardKey]: opt }))}
                            className={`px-3 py-1 rounded-lg text-xs border transition-all ${form[guardKey] === opt ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Product Categories */}
          {CATEGORIES.map(cat => {
            const isStaffCat = cat === '計時人員';
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isStaffCat && <Users size={18} className="text-brand-500" />}
                    <span className="font-semibold text-gray-800">{cat}</span>
                    {isStaffCat ? (
                      staffItems.length > 0 && (
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {staffItems.length} 筆工時 · NT${Math.round(staffTotal).toLocaleString()}
                        </span>
                      )
                    ) : (
                      catItems(cat).length > 0 && (
                        <span className="bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {catItems(cat).length} 項 · NT${catTotal(cat).toLocaleString()}
                        </span>
                      )
                    )}
                  </div>
                  {expandedCats[cat] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {expandedCats[cat] && (
                  <div className="px-5 pb-5">
                    {/* Product catalog chips */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {PRODUCT_CATALOG[cat].map(p => (
                        <button key={p.name} onClick={() => addItem(cat, p.name, p.price)}
                          className="text-xs bg-gray-100 hover:bg-brand-100 hover:text-brand-700 text-gray-600 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">
                          <Plus size={12} />{p.name}
                          {p.price > 0 && <span className="text-gray-400 ml-1">${p.price.toLocaleString()}</span>}
                        </button>
                      ))}
                      {/* +自訂 button */}
                      {!isStaffCat ? (
                        <button onClick={() => setCustomForm({ category: cat, name: '', price: '0', qty: '1' })}
                          className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-dashed border-amber-300 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">
                          <Plus size={12} />自訂
                        </button>
                      ) : (
                        <button onClick={() => setCustomStaffForm({ name: '', price: '600' })}
                          className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-dashed border-amber-300 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">
                          <Plus size={12} />自訂人員
                        </button>
                      )}
                    </div>

                    {/* Custom item inline form */}
                    {customForm?.category === cat && (
                      <div className="flex flex-wrap gap-2 items-center mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <input value={customForm.name} onChange={e => setCustomForm(f => f ? { ...f, name: e.target.value } : f)}
                          placeholder="品項名稱"
                          className="flex-1 min-w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">$</span>
                          <input type="number" value={customForm.price} onChange={e => setCustomForm(f => f ? { ...f, price: e.target.value } : f)}
                            placeholder="單價"
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">×</span>
                          <input type="number" value={customForm.qty} onChange={e => setCustomForm(f => f ? { ...f, qty: e.target.value } : f)}
                            placeholder="數量" min={1}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        </div>
                        <button onClick={addCustomItem}
                          className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors">確認新增</button>
                        <button onClick={() => setCustomForm(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors">取消</button>
                      </div>
                    )}

                    {/* Custom staff item inline form */}
                    {isStaffCat && customStaffForm !== null && (
                      <div className="flex flex-wrap gap-2 items-center mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <input value={customStaffForm.name}
                          onChange={e => setCustomStaffForm(f => f ? { ...f, name: e.target.value } : f)}
                          placeholder="人員品項名稱（如：司機、油漆師傅）"
                          className="flex-1 min-w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400">時薪 $</span>
                          <input type="number" value={customStaffForm.price}
                            onChange={e => setCustomStaffForm(f => f ? { ...f, price: e.target.value } : f)}
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-amber-400" />
                        </div>
                        <button onClick={() => {
                          addStaffItem(customStaffForm.name || '自訂人員', parseFloat(customStaffForm.price) || 0);
                          setCustomStaffForm(null);
                        }}
                          className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition-colors">確認新增</button>
                        <button onClick={() => setCustomStaffForm(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition-colors">取消</button>
                      </div>
                    )}

                    {/* ── 計時人員：合併工時排班區（無獨立 line items） ── */}
                    {isStaffCat ? (
                      <div>
                        <p className="text-xs text-gray-400 mb-3">每筆計算：工時 × 人數 × 時薪（工時 = 結束 − 開始 − 休息）</p>
                        {staffItems.length > 0 && (
                          <div className="space-y-2 mb-3">
                            <div className="grid text-xs text-gray-400 font-medium gap-2 px-2"
                              style={{ gridTemplateColumns: '80px 1fr 1fr 72px 1fr 52px 1fr 28px' }}>
                              <span>品項</span>
                              <span>日期</span>
                              <span>開始</span>
                              <span>結束</span>
                              <span className="text-center">休息(h)</span>
                              <span className="text-center">人數</span>
                              <span className="text-right">時薪/人</span>
                              <span />
                            </div>
                            {staffItems.map((item, idx) => {
                              const hours = calcHours(item.start_time, item.end_time, item.break_hours);
                              const sub = Math.round(hours * item.person_count * item.unit_price);
                              return (
                                <div key={idx}
                                  draggable
                                  onDragStart={() => handleStaffDragStart(idx)}
                                  onDragOver={e => handleStaffDragOver(e, idx)}
                                  className="bg-gray-50 rounded-xl px-2 py-2 cursor-grab active:cursor-grabbing">
                                  <div className="grid gap-2 items-center"
                                    style={{ gridTemplateColumns: '80px 1fr 1fr 72px 1fr 52px 1fr 28px' }}>
                                    {/* 品項名稱 */}
                                    <select value={item.item_name}
                                      onChange={e => {
                                        const p = PRODUCT_CATALOG['計時人員'].find(p => p.name === e.target.value);
                                        updateStaffItem(idx, 'item_name', e.target.value);
                                        if (p) updateStaffItem(idx, 'unit_price', p.price);
                                      }}
                                      className="bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                                      {PRODUCT_CATALOG['計時人員'].map(p => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                      ))}
                                    </select>
                                    {/* 日期 */}
                                    <input type="date" value={item.work_date}
                                      onChange={e => updateStaffItem(idx, 'work_date', e.target.value)}
                                      className="bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                    {/* 開始時間 */}
                                    <TimeInput value={item.start_time}
                                      onChange={v => updateStaffItem(idx, 'start_time', v)} />
                                    {/* 結束時間 */}
                                    <TimeInput value={item.end_time}
                                      onChange={v => updateStaffItem(idx, 'end_time', v)} />
                                    {/* 休息時間 */}
                                    <select value={item.break_hours}
                                      onChange={e => updateStaffItem(idx, 'break_hours', parseFloat(e.target.value))}
                                      className="bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-400">
                                      {BREAK_OPTIONS.map(v => (
                                        <option key={v} value={v}>{v === 0 ? '無' : `${v}h`}</option>
                                      ))}
                                    </select>
                                    {/* 人數 */}
                                    <input {...numericInputProps(item.person_count, v => updateStaffItem(idx, 'person_count', v), 1)}
                                      className="bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                    {/* 時薪 + 小計 */}
                                    <div className="flex items-center justify-end gap-0.5">
                                      <span className="text-xs text-gray-400">$</span>
                                      <input {...numericInputProps(item.unit_price, v => updateStaffItem(idx, 'unit_price', v))}
                                        className="w-16 text-right text-xs bg-white border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                    </div>
                                    <button onClick={() => removeStaffItem(idx)} className="flex justify-center p-1 hover:text-red-500 transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  {/* Sub-row: computed hours & subtotal */}
                                  <div className="mt-1 flex items-center gap-3 px-2 text-xs text-gray-500">
                                    <span>工時：{hours.toFixed(1)} h</span>
                                    <span className="text-gray-300">（{item.start_time} – {item.end_time}{item.break_hours > 0 ? ` − ${item.break_hours}h 休息` : ''}）</span>
                                    <span className="ml-auto font-semibold text-gray-800">小計 NT${sub.toLocaleString()}</span>
                                  </div>
                                </div>
                              );
                            })}
                            <p className="text-right text-xs text-gray-400 pr-2 mt-1">※ 休息時間不計費</p>
                            <div className="text-right text-sm font-semibold text-green-600 pr-2 pt-1">
                              計時人員合計：NT${Math.round(staffTotal).toLocaleString()}
                            </div>
                          </div>
                        )}
                        <button onClick={() => addStaffItem()}
                          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 border border-dashed border-green-300 hover:border-green-400 px-4 py-2 rounded-xl transition-all w-full justify-center">
                          <Plus size={15} />新增工時記錄
                        </button>
                      </div>
                    ) : (
                      /* ── Non-staff line items ── */
                      <>
                        {catItems(cat).length > 0 && (
                          <div className="space-y-2 mb-4">
                            <div className="hidden sm:grid grid-cols-12 text-xs text-gray-400 font-medium px-2 gap-2">
                              <span className="col-span-4">品項</span>
                              <span className="col-span-3 text-right">單價</span>
                              <span className="col-span-2 text-center">數量</span>
                              <span className="col-span-2 text-right">小計</span>
                              <span className="col-span-1" />
                            </div>
                            {items.map((item, idx) => item.category !== cat ? null : (
                              <div key={idx} className="bg-gray-50 rounded-xl px-2 py-1.5">
                                {/* Desktop row */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                                  <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                                    className="col-span-4 bg-transparent text-sm text-gray-800 focus:outline-none" />
                                  <div className="col-span-3 flex items-center justify-end gap-0.5">
                                    <span className="text-xs text-gray-400">$</span>
                                    <input {...numericInputProps(item.unit_price, v => updateItem(idx, 'unit_price', v))}
                                      className="w-20 text-right text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                  </div>
                                  <div className="col-span-2 flex items-center justify-center gap-1">
                                    <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100 flex-shrink-0">-</button>
                                    <input {...numericInputProps(item.quantity, v => updateItem(idx, 'quantity', v), 1)}
                                      className="w-10 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                    <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
                                      className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100 flex-shrink-0">+</button>
                                  </div>
                                  <div className="col-span-2 text-right text-sm font-medium text-gray-800">
                                    ${(item.unit_price * item.quantity).toLocaleString()}
                                  </div>
                                  <button onClick={() => removeItem(idx)} className="col-span-1 flex justify-center p-1 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                                {/* Mobile stacked row */}
                                <div className="sm:hidden space-y-2 py-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                                      className="flex-1 bg-transparent text-sm text-gray-800 font-medium focus:outline-none min-w-0" />
                                    <button onClick={() => removeItem(idx)} className="p-1 hover:text-red-500 transition-colors flex-shrink-0">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">$</span>
                                      <input {...numericInputProps(item.unit_price, v => updateItem(idx, 'unit_price', v))}
                                        className="w-16 text-right text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                                        className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100">-</button>
                                      <input {...numericInputProps(item.quantity, v => updateItem(idx, 'quantity', v), 1)}
                                        className="w-10 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                      <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
                                        className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100">+</button>
                                    </div>
                                    <span className="text-sm font-medium text-gray-800">${(item.unit_price * item.quantity).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="text-right text-sm font-semibold text-brand-600 pr-2 pt-1">
                              小計：NT${catTotal(cat).toLocaleString()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Quote Schedule (Gantt Input) ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandedCats(p => ({ ...p, _schedule: !p._schedule }))}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-purple-500" />
                <span className="font-semibold text-gray-800">作業排程</span>
                {scheduleItems.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {scheduleItems.length} 項
                  </span>
                )}
              </div>
              {expandedCats._schedule ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {expandedCats._schedule && (
              <div className="px-5 pb-5">
                <p className="text-xs text-gray-400 mb-3">列印報價單時將顯示排程表與 Gantt 圖。時間未重疊的項目在同一列顯示。</p>
                {scheduleItems.length > 0 && (
                  <div className="space-y-2 mb-3">
                    <div className="grid grid-cols-12 text-xs text-gray-400 font-medium gap-2 px-2">
                      <span className="col-span-2">日期</span>
                      <span className="col-span-2">開始</span>
                      <span className="col-span-2">結束</span>
                      <span className="col-span-3">作業名稱</span>
                      <span className="col-span-2">分類</span>
                      <span className="col-span-1" />
                    </div>
                    {scheduleItems.map((item, idx) => (
                      <div key={idx}
                        draggable
                        onDragStart={() => handleSchedDragStart(idx)}
                        onDragOver={e => handleSchedDragOver(e, idx)}
                        className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl px-2 py-2 cursor-grab active:cursor-grabbing">
                        <input type="date" value={item.work_date}
                          onChange={e => updateScheduleItem(idx, 'work_date', e.target.value)}
                          className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                        <TimeInput value={item.start_time}
                          onChange={v => updateScheduleItem(idx, 'start_time', v)}
                          className="col-span-2" />
                        <TimeInput value={item.end_time}
                          onChange={v => updateScheduleItem(idx, 'end_time', v)}
                          className="col-span-2" />
                        <input value={item.label} onChange={e => updateScheduleItem(idx, 'label', e.target.value)}
                          placeholder="作業名稱"
                          className="col-span-3 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                        <select value={item.category} onChange={e => updateScheduleItem(idx, 'category', e.target.value)}
                          className="col-span-2 bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400">
                          {SCHEDULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <button onClick={() => removeScheduleItem(idx)} className="col-span-1 flex justify-center p-1 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={addScheduleItem}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 border border-dashed border-purple-300 hover:border-purple-400 px-4 py-2 rounded-xl transition-all w-full justify-center">
                  <Plus size={15} />新增排程項目
                </button>
              </div>
            )}
          </div>

          {/* ── 備註區 ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlignLeft size={16} className="text-gray-500" />
                <h2 className="font-semibold text-gray-800">備註</h2>
              </div>
              <button onClick={addRemarkNote}
                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-3 py-1 rounded-lg transition-all">
                <Plus size={12} />新增條目
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">此備註將顯示於報價單注意事項上方</p>
            {remarkNotes.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-3">尚無備註，點擊右上角「新增條目」</p>
            )}
            <div className="space-y-2">
              {remarkNotes.map((note, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm flex-shrink-0">•</span>
                  <input value={note} onChange={e => updateRemarkNote(idx, e.target.value)}
                    placeholder="輸入備註內容..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  <button onClick={() => removeRemarkNote(idx)}
                    className="p-1.5 hover:text-red-500 text-gray-400 transition-colors flex-shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── 注意事項 ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800">注意事項</h2>
              <button onClick={toggleAllNotes}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 transition-colors">
                {checkedNotes.size === notes.length && notes.length > 0
                  ? <><CheckSquare size={14} className="text-brand-500" />取消全選</>
                  : <><Square size={14} />全選</>}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">勾選的項目將列印於報價單下方</p>
            <div className="space-y-2">
              {notes.map(note => (
                <label key={note.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={checkedNotes.has(note.id)} onChange={() => toggleNote(note.id)}
                    className="mt-0.5 w-4 h-4 accent-brand-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{note.content}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-3">內部備注</h2>
            <p className="text-xs text-gray-400 mb-3">此備注僅供內部使用，不會顯示在報價單上</p>
            <textarea value={form.internal_notes} onChange={e => setForm({ ...form, internal_notes: e.target.value })}
              rows={3} placeholder="內部備忘..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          </div>
        </div>

        {/* ── Right: Summary ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 xl:sticky xl:top-4">
            <h2 className="font-semibold text-gray-800 mb-4">費用摘要</h2>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const total = catTotal(cat);
                return total > 0 ? (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-500">{cat}</span>
                    <span className="font-medium">NT${total.toLocaleString()}</span>
                  </div>
                ) : null;
              })}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-800">小計</span>
                <span className={`text-lg font-bold ${discount > 0 ? 'text-gray-400 line-through' : 'text-brand-600'}`}>
                  NT${subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Discount */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-16 flex-shrink-0">折扣</label>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-gray-400">NT$</span>
                  <input {...numericInputProps(discount, setDiscount)} placeholder="0"
                    className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>
              {discount > 0 && (
                <div className="flex justify-between bg-brand-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-brand-800 text-sm">折扣後合計（含稅）</span>
                  <span className="text-xl font-bold text-brand-600">NT${discountedTotal.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Deposit / Balance */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-16 flex-shrink-0">定金</label>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-gray-400">NT$</span>
                  <input {...numericInputProps(deposit, setDeposit)} placeholder="0"
                    className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">尾款</span>
                <span className="font-semibold text-green-600">NT${balance.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Link */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">付款連結</label>
                <input type="url" value={form.payment_link}
                  onChange={e => setForm({ ...form, payment_link: e.target.value })}
                  placeholder="https://pay.example.com/..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">付款狀態</label>
                <select value={form.payment_status}
                  onChange={e => setForm({ ...form, payment_status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-400">
                  <option value="">未設定</option>
                  <option value="待付款">待付款</option>
                  <option value="已付款">已付款</option>
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button onClick={() => handleSave(false)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl transition-all disabled:opacity-60">
                <Save size={15} />儲存
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
                <Eye size={15} />預覽並產出報價單
              </button>
            </div>
          </div>

          {/* Mobile bottom action bar */}
          <div className="xl:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 flex gap-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 text-sm rounded-xl">
              <Save size={15} />儲存
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-500 text-white text-sm rounded-xl">
              <Eye size={15} />預覽
            </button>
          </div>
          <div className="xl:hidden h-16" />
        </div>
      </div>
    </div>
  );
}
