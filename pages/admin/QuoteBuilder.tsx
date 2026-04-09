import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, ArrowLeft, Users, CalendarDays } from 'lucide-react';
import { supabase, NoteTemplate, T } from '../../lib/supabase';

// ─── Product Catalog ──────────────────────────────────────────────────────────
const PRODUCT_CATALOG: Record<string, { name: string; price: number }[]> = {
  '搬家車趟費': [
    { name: '搬家車資（3.5噸）', price: 3500 },
    { name: '家具封膜費', price: 2000 },
    { name: '床組拆裝費', price: 800 },
    { name: '鐵架拆裝費', price: 0 },
    { name: '廢棄物清運', price: 11000 },
    { name: '另址搬運費', price: 600 },
    { name: '搬工（計時）', price: 1900 },
    { name: '鋼琴搬運', price: 0 },
    { name: '冰箱交換費', price: 1800 },
  ],
  '打包計時人員': [
    { name: '整聊師（時薪制）', price: 600 },
    { name: '加時費用', price: 650 },
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
const SCHEDULE_CATEGORIES = ['搬家', '打包', '清運', '其他'];

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
  work_date: string;
  start_time: string;
  end_time: string;
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
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcHours = (start: string, end: string): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
};

const staffSubtotal = (items: StaffItemForm[]) =>
  items.reduce((sum, i) => sum + calcHours(i.start_time, i.end_time) * i.person_count * i.unit_price, 0);

const TODAY = new Date().toISOString().split('T')[0];

// ─── Component ───────────────────────────────────────────────────────────────
export default function QuoteBuilder() {
  const { bookingId, quoteId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<QuoteForm>({
    customer_name: '', phone: '', email: '', tax_id: '',
    company_name: '',
    address_from: '', address_from_type: '', address_from_parking: '', address_from_basement: '', address_from_guard: '',
    address_to: '', address_to_type: '', address_to_parking: '', address_to_basement: '', address_to_guard: '',
    consultant_name: '', consultant_phone: '', internal_notes: '',
  });
  const [deposit, setDeposit] = useState(0);
  const [items, setItems] = useState<LineItem[]>([]);
  const [staffItems, setStaffItems] = useState<StaffItemForm[]>([]);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItemForm[]>([]);
  const [notes, setNotes] = useState<NoteTemplate[]>([]);
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ '搬家車趟費': true, _staff: true, _schedule: true, '打包計時人員': true });
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('草稿');
  const [saveMsg, setSaveMsg] = useState('');

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
          if (data) setForm(f => ({
            ...f,
            customer_name: data.customer_name,
            phone: data.phone,
            email: data.email ?? '',
            address_from: data.address_from ?? '',
          }));
        });
    }
  }, [bookingId]);

  useEffect(() => {
    if (!quoteId) {
      const now = new Date();
      setQuoteNumber(`QUO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`);
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
      });
      setItems((data.quote_items ?? []).map((item: any) => ({
        id: item.id, category: item.category, name: item.name,
        unit_price: item.unit_price, quantity: item.quantity, sort_order: item.sort_order,
      })));
      setCheckedNotes(new Set((data.quote_checked_notes ?? []).map((n: any) => n.note_id)));

      // Load staff schedule items
      const { data: staffData } = await supabase.from(T.staffSchedule)
        .select('*').eq('quote_id', quoteId).order('sort_order');
      if (staffData) setStaffItems(staffData.map((s: any) => ({
        id: s.id, work_date: s.work_date, start_time: s.start_time.slice(0,5),
        end_time: s.end_time.slice(0,5), person_count: s.person_count, unit_price: s.unit_price,
      })));

      // Load quote schedule items
      const { data: schedData } = await supabase.from(T.quoteSchedule)
        .select('*').eq('quote_id', quoteId).order('sort_order');
      if (schedData) setScheduleItems(schedData.map((s: any) => ({
        id: s.id, work_date: s.work_date, start_time: s.start_time.slice(0,5),
        end_time: s.end_time.slice(0,5), label: s.label, category: s.category,
      })));
    };
    load();
  }, [quoteId]);

  // ── Line Items ───────────────────────────────────────────────────────────────
  const addItem = (category: string, productName: string, price: number) => {
    const existing = items.findIndex(i => i.category === category && i.name === productName);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setItems(prev => [...prev, { category, name: productName, unit_price: price, quantity: 1, sort_order: prev.length }]);
    }
  };
  const updateItem = (idx: number, field: 'quantity' | 'unit_price' | 'name', value: number | string) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const toggleNote = (id: string) => setCheckedNotes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Staff Items ──────────────────────────────────────────────────────────────
  const addStaffItem = () => setStaffItems(prev => [...prev, {
    work_date: TODAY, start_time: '09:00', end_time: '17:00', person_count: 2, unit_price: 600,
  }]);
  const updateStaffItem = (idx: number, field: keyof StaffItemForm, value: string | number) =>
    setStaffItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  const removeStaffItem = (idx: number) => setStaffItems(prev => prev.filter((_, i) => i !== idx));

  const handleStaffDragStart = (idx: number) => { dragStaffIdx.current = idx; };
  const handleStaffDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); dragStaffIdx.current !== null && (dragStaffIdx.current !== idx) && (() => {
    const next = [...staffItems];
    const [moved] = next.splice(dragStaffIdx.current!, 1);
    next.splice(idx, 0, moved);
    dragStaffIdx.current = idx;
    setStaffItems(next);
  })(); };

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

  // ── Subtotals ─────────────────────────────────────────────────────────────────
  const lineItemSubtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const staffTotal = staffSubtotal(staffItems);
  const subtotal = lineItemSubtotal + staffTotal;
  const balance = Math.max(0, subtotal - deposit);

  const catItems = (cat: string) => items.filter(i => i.category === cat);
  const catTotal = (cat: string) => catItems(cat).reduce((s, i) => s + i.unit_price * i.quantity, 0);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (redirectToView = false) => {
    setSaving(true);
    try {
      const quoteData = {
        quote_number: quoteNumber, booking_id: bookingId ?? null,
        ...form, subtotal, total: subtotal, deposit,
        status: (quoteStatus === '草稿' ? '草稿' : quoteStatus) as any,
      };
      let qid = existingQuoteId;
      if (qid) {
        await supabase.from(T.quotes).update(quoteData).eq('id', qid);
        await supabase.from(T.quoteItems).delete().eq('quote_id', qid);
        await supabase.from(T.checkedNotes).delete().eq('quote_id', qid);
        await supabase.from(T.staffSchedule).delete().eq('quote_id', qid);
        await supabase.from(T.quoteSchedule).delete().eq('quote_id', qid);
      } else {
        const { data } = await supabase.from(T.quotes).insert(quoteData).select().single();
        qid = data?.id;
        setExistingQuoteId(qid ?? null);
      }
      if (qid && items.length > 0) {
        await supabase.from(T.quoteItems).insert(items.map((item, idx) => ({
          quote_id: qid, category: item.category, name: item.name,
          unit_price: item.unit_price, quantity: item.quantity, sort_order: idx,
        })));
      }
      if (qid && staffItems.length > 0) {
        await supabase.from(T.staffSchedule).insert(staffItems.map((s, idx) => ({
          quote_id: qid, work_date: s.work_date, start_time: s.start_time,
          end_time: s.end_time, person_count: s.person_count, unit_price: s.unit_price, sort_order: idx,
        })));
      }
      if (qid && scheduleItems.length > 0) {
        await supabase.from(T.quoteSchedule).insert(scheduleItems.map((s, idx) => ({
          quote_id: qid, work_date: s.work_date, start_time: s.start_time,
          end_time: s.end_time, label: s.label, category: s.category, sort_order: idx,
        })));
      }
      if (qid && checkedNotes.size > 0) {
        await supabase.from(T.checkedNotes).insert(
          Array.from(checkedNotes).map(nid => ({ quote_id: qid, note_id: nid }))
        );
      }
      setSaveMsg('已儲存');
      setTimeout(() => setSaveMsg(''), 2000);
      if (redirectToView && qid) navigate(`/admin/quotes/${qid}/view`);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
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
          {saveMsg && <span className="text-sm text-green-600 font-medium">{saveMsg}</span>}
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
              const placeholder = side === 'from' ? '台北市...' : '新北市...';
              const typeKey = `address_${side}_type` as keyof QuoteForm;
              const parkingKey = `address_${side}_parking` as keyof QuoteForm;
              const basementKey = `address_${side}_basement` as keyof QuoteForm;
              const guardKey = `address_${side}_guard` as keyof QuoteForm;
              return (
                <div key={side} className="mt-4 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
                  <input value={form[addrKey]} onChange={e => setForm({ ...form, [addrKey]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 mb-3" />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {/* Q1 建築類型 */}
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
                    {/* Q2 臨停區 */}
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
                    {/* Q3 地下室高度 */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">地下室高度（選填）</p>
                      <input value={form[basementKey]} onChange={e => setForm(f => ({ ...f, [basementKey]: e.target.value }))}
                        placeholder="例：2.1m"
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                    </div>
                    {/* Q4 管理室 */}
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
            {/* Consultant */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">服務顧問</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">顧問姓名</label>
                  <input value={form.consultant_name} onChange={e => setForm({ ...form, consultant_name: e.target.value })}
                    placeholder="顧問姓名"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">顧問聯繫方式</label>
                  <input value={form.consultant_phone} onChange={e => setForm({ ...form, consultant_phone: e.target.value })}
                    placeholder="電話 / LINE"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Product Categories */}
          {CATEGORIES.map(cat => (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  {cat === '打包計時人員' && <Users size={18} className="text-brand-500" />}
                  <span className="font-semibold text-gray-800">{cat}</span>
                  {cat === '打包計時人員' ? (
                    (catItems(cat).length > 0 || staffItems.length > 0) && (
                      <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {staffItems.length} 筆工時 · NT${(catTotal(cat) + Math.round(staffTotal)).toLocaleString()}
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
                  </div>
                  {/* Line items */}
                  {catItems(cat).length > 0 && (
                    <div className="space-y-2 mb-4">
                      <div className="grid grid-cols-12 text-xs text-gray-400 font-medium px-2 gap-2">
                        <span className="col-span-4">品項</span>
                        <span className="col-span-3 text-right">單價</span>
                        <span className="col-span-2 text-center">數量</span>
                        <span className="col-span-2 text-right">小計</span>
                        <span className="col-span-1" />
                      </div>
                      {items.map((item, idx) => item.category !== cat ? null : (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl px-2 py-1.5">
                          <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                            className="col-span-4 bg-transparent text-sm text-gray-800 focus:outline-none" />
                          <div className="col-span-3 flex items-center justify-end gap-0.5">
                            <span className="text-xs text-gray-400">$</span>
                            <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', +e.target.value)}
                              className="w-20 text-right text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                          </div>
                          <div className="col-span-2 flex items-center justify-center gap-1">
                            <button onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100 flex-shrink-0">-</button>
                            <input
                              type="number" min={1} value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-10 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
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
                      ))}
                      {cat !== '打包計時人員' && (
                        <div className="text-right text-sm font-semibold text-brand-600 pr-2 pt-1">
                          小計：NT${catTotal(cat).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── 打包計時人員：工時排班區塊 ── */}
                  {cat === '打包計時人員' && (
                    <div className={catItems(cat).length > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}>
                      <p className="text-xs text-gray-400 mb-3">計時人員工時安排：每筆計算 工時 × 人數 × 時薪</p>
                      {staffItems.length > 0 && (
                        <div className="space-y-2 mb-3">
                          <div className="grid grid-cols-12 text-xs text-gray-400 font-medium gap-2 px-2">
                            <span className="col-span-2">日期</span>
                            <span className="col-span-2">開始</span>
                            <span className="col-span-2">結束</span>
                            <span className="col-span-1 text-center">人數</span>
                            <span className="col-span-2 text-right">時薪/人</span>
                            <span className="col-span-2 text-right">小計</span>
                            <span className="col-span-1" />
                          </div>
                          {staffItems.map((item, idx) => {
                            const hours = calcHours(item.start_time, item.end_time);
                            const sub = Math.round(hours * item.person_count * item.unit_price);
                            return (
                              <div key={idx}
                                draggable
                                onDragStart={() => handleStaffDragStart(idx)}
                                onDragOver={e => handleStaffDragOver(e, idx)}
                                className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-xl px-2 py-2 cursor-grab active:cursor-grabbing">
                                <input type="date" value={item.work_date}
                                  onChange={e => updateStaffItem(idx, 'work_date', e.target.value)}
                                  className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                <input type="time" value={item.start_time}
                                  onChange={e => updateStaffItem(idx, 'start_time', e.target.value)}
                                  className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                <input type="time" value={item.end_time}
                                  onChange={e => updateStaffItem(idx, 'end_time', e.target.value)}
                                  className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                <input type="number" min={1} value={item.person_count}
                                  onChange={e => updateStaffItem(idx, 'person_count', +e.target.value)}
                                  className="col-span-1 bg-white border border-gray-200 rounded-lg px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                <div className="col-span-2 flex items-center justify-end gap-0.5">
                                  <span className="text-xs text-gray-400">$</span>
                                  <input type="number" value={item.unit_price}
                                    onChange={e => updateStaffItem(idx, 'unit_price', +e.target.value)}
                                    className="w-16 text-right text-xs bg-white border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                                </div>
                                <div className="col-span-2 text-right text-xs font-semibold text-gray-800">
                                  ${sub.toLocaleString()}
                                  <div className="text-gray-400 font-normal">{hours.toFixed(1)}h × {item.person_count}人</div>
                                </div>
                                <button onClick={() => removeStaffItem(idx)} className="col-span-1 flex justify-center p-1 hover:text-red-500 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                          <div className="text-right text-sm font-semibold text-green-600 pr-2 pt-1">
                            人員費小計：NT${Math.round(staffTotal).toLocaleString()}
                          </div>
                        </div>
                      )}
                      <button onClick={addStaffItem}
                        className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 border border-dashed border-green-300 hover:border-green-400 px-4 py-2 rounded-xl transition-all w-full justify-center">
                        <Plus size={15} />新增工時記錄
                      </button>
                      {(catItems(cat).length > 0 || staffItems.length > 0) && (
                        <div className="text-right text-sm font-semibold text-brand-600 pr-2 pt-3 border-t border-gray-100 mt-3">
                          打包計時人員合計：NT${(catTotal(cat) + Math.round(staffTotal)).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

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
                <p className="text-xs text-gray-400 mb-3">列印報價單時將顯示排程表與 Gantt 圖</p>
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
                        <input type="time" value={item.start_time}
                          onChange={e => updateScheduleItem(idx, 'start_time', e.target.value)}
                          className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
                        <input type="time" value={item.end_time}
                          onChange={e => updateScheduleItem(idx, 'end_time', e.target.value)}
                          className="col-span-2 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400" />
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

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">注意事項</h2>
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
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-4">
            <h2 className="font-semibold text-gray-800 mb-4">費用摘要</h2>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const lineTotal = catTotal(cat);
                const total = cat === '打包計時人員' ? lineTotal + Math.round(staffTotal) : lineTotal;
                return total > 0 ? (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-500">{cat}</span>
                    <span className="font-medium">NT${total.toLocaleString()}</span>
                  </div>
                ) : null;
              })}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-800">合計（含稅）</span>
                <span className="text-xl font-bold text-brand-600">NT${subtotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Deposit / Balance */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 w-16 flex-shrink-0">定金</label>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-gray-400">NT$</span>
                  <input type="number" min={0} value={deposit}
                    onChange={e => setDeposit(Math.max(0, +e.target.value))}
                    className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">尾款</span>
                <span className="font-semibold text-green-600">NT${balance.toLocaleString()}</span>
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
        </div>
      </div>
    </div>
  );
}
