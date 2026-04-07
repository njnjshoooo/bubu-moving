import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, ArrowLeft } from 'lucide-react';
import { supabase, NoteTemplate, Booking } from '../../lib/supabase';

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

interface LineItem {
  id?: string;
  category: string;
  name: string;
  unit_price: number;
  quantity: number;
  sort_order: number;
}

interface QuoteForm {
  customer_name: string;
  phone: string;
  email: string;
  tax_id: string;
  company_name: string;
  address_from: string;
  address_to: string;
  internal_notes: string;
}

export default function QuoteBuilder() {
  const { bookingId, quoteId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<QuoteForm>({
    customer_name: '', phone: '', email: '', tax_id: '',
    company_name: '', address_from: '', address_to: '', internal_notes: '',
  });
  const [items, setItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState<NoteTemplate[]>([]);
  const [checkedNotes, setCheckedNotes] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ '搬家車趟費': true });
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [existingQuoteId, setExistingQuoteId] = useState<string | null>(null);

  // Load note templates
  useEffect(() => {
    supabase.from('quote_note_templates').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setNotes(data ?? []));
  }, []);

  // Load booking if coming from a booking
  useEffect(() => {
    if (bookingId) {
      supabase.from('bookings').select('*').eq('id', bookingId).single()
        .then(({ data }) => {
          if (data) {
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

  // Load existing quote if editing
  useEffect(() => {
    if (!quoteId) {
      // Generate new quote number
      const now = new Date();
      const num = `QUO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
      setQuoteNumber(num);
      return;
    }
    supabase.from('quotes').select('*, quote_items(*), quote_checked_notes(note_id)')
      .eq('id', quoteId).single()
      .then(({ data }) => {
        if (!data) return;
        setExistingQuoteId(data.id);
        setQuoteNumber(data.quote_number);
        setForm({
          customer_name: data.customer_name, phone: data.phone,
          email: data.email ?? '', tax_id: data.tax_id ?? '',
          company_name: data.company_name ?? '',
          address_from: data.address_from ?? '', address_to: data.address_to ?? '',
          internal_notes: data.internal_notes ?? '',
        });
        setItems((data.quote_items ?? []).map((item: any) => ({
          id: item.id, category: item.category, name: item.name,
          unit_price: item.unit_price, quantity: item.quantity, sort_order: item.sort_order,
        })));
        setCheckedNotes(new Set((data.quote_checked_notes ?? []).map((n: any) => n.note_id)));
      });
  }, [quoteId]);

  const addItem = (category: string, productName: string, price: number) => {
    const existing = items.findIndex(i => i.category === category && i.name === productName);
    if (existing >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existing ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setItems(prev => [...prev, { category, name: productName, unit_price: price, quantity: 1, sort_order: prev.length }]);
    }
  };

  const updateItem = (idx: number, field: 'quantity' | 'unit_price' | 'name', value: number | string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleNote = (id: string) => {
    setCheckedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSave = async (redirectToView = false) => {
    setSaving(true);
    try {
      const quoteData = {
        quote_number: quoteNumber,
        booking_id: bookingId ?? null,
        ...form,
        subtotal,
        total: subtotal,
        status: '草稿' as const,
      };

      let qid = existingQuoteId;

      if (qid) {
        await supabase.from('quotes').update(quoteData).eq('id', qid);
        await supabase.from('quote_items').delete().eq('quote_id', qid);
        await supabase.from('quote_checked_notes').delete().eq('quote_id', qid);
      } else {
        const { data } = await supabase.from('quotes').insert(quoteData).select().single();
        qid = data?.id;
        setExistingQuoteId(qid ?? null);
      }

      if (qid && items.length > 0) {
        await supabase.from('quote_items').insert(items.map((item, idx) => ({
          quote_id: qid, category: item.category, name: item.name,
          unit_price: item.unit_price, quantity: item.quantity, sort_order: idx,
        })));
      }

      if (qid && checkedNotes.size > 0) {
        await supabase.from('quote_checked_notes').insert(
          Array.from(checkedNotes).map(nid => ({ quote_id: qid, note_id: nid }))
        );
      }

      if (redirectToView && qid) {
        navigate(`/admin/quotes/${qid}/view`);
      }
    } finally {
      setSaving(false);
    }
  };

  const catItems = (cat: string) => items.filter(i => i.category === cat);
  const catTotal = (cat: string) => catItems(cat).reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm rounded-xl transition-all disabled:opacity-60">
            <Save size={15} />儲存草稿
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
            <Eye size={15} />預覽 / 產出報價單
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Customer Info + Items */}
        <div className="xl:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">客戶資訊</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { field: 'customer_name', label: '客戶姓名 *', placeholder: '王小明' },
                { field: 'phone', label: '聯絡電話 *', placeholder: '0912-345-678' },
                { field: 'email', label: 'E-mail', placeholder: 'client@example.com' },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">搬遷地址（舊家）</label>
                <input value={form.address_from} onChange={e => setForm({ ...form, address_from: e.target.value })}
                  placeholder="台北市..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">搬入地址（新家）</label>
                <input value={form.address_to} onChange={e => setForm({ ...form, address_to: e.target.value })}
                  placeholder="新北市..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          </div>

          {/* Product Selection by Category */}
          {CATEGORIES.map(cat => (
            <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setExpandedCats(p => ({ ...p, [cat]: !p[cat] }))}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{cat}</span>
                  {catItems(cat).length > 0 && (
                    <span className="bg-brand-100 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      {catItems(cat).length} 項 · NT${catTotal(cat).toLocaleString()}
                    </span>
                  )}
                </div>
                {expandedCats[cat] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {expandedCats[cat] && (
                <div className="px-5 pb-5">
                  {/* Product Buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {PRODUCT_CATALOG[cat].map(p => (
                      <button key={p.name} onClick={() => addItem(cat, p.name, p.price)}
                        className="text-xs bg-gray-100 hover:bg-brand-100 hover:text-brand-700 text-gray-600 px-3 py-1.5 rounded-full transition-all flex items-center gap-1">
                        <Plus size={12} />
                        {p.name}
                        {p.price > 0 && <span className="text-gray-400 ml-1">${p.price.toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Added Items */}
                  {catItems(cat).length > 0 && (
                    <div className="space-y-2">
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
                              className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100">-</button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-sm hover:bg-gray-100">+</button>
                          </div>
                          <div className="col-span-2 text-right text-sm font-medium text-gray-800">
                            ${(item.unit_price * item.quantity).toLocaleString()}
                          </div>
                          <button onClick={() => removeItem(idx)} className="col-span-1 flex justify-center p-1 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="text-right text-sm font-semibold text-brand-600 pr-2 pt-1">
                        小計：NT${catTotal(cat).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

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

        {/* Right: Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-4">
            <h2 className="font-semibold text-gray-800 mb-4">費用摘要</h2>
            <div className="space-y-3">
              {CATEGORIES.map(cat => (
                catItems(cat).length > 0 && (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-gray-500">{cat}</span>
                    <span className="font-medium">NT${catTotal(cat).toLocaleString()}</span>
                  </div>
                )
              ))}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-gray-800">合計（含稅）</span>
                <span className="text-xl font-bold text-brand-600">NT${subtotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button onClick={() => handleSave(false)} disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-xl transition-all disabled:opacity-60">
                <Save size={15} />儲存草稿
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
