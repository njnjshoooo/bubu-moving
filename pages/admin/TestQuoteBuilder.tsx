import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  supabase, T, Quote, QuoteScheduleItem, QuoteItem,
  TestQuote, TestQuoteFeeCategories, TestQuoteFeeItem,
  MovingPlan, QuoteRecording,
} from '../../lib/supabase';
import {
  ArrowLeft, Save, Plus, Trash2, Eye, EyeOff,
  Calendar, MapPin, Package, Users, Truck, AlertCircle,
  Heart, Lock, FileText, Sparkles, Printer, Copy, Clock,
  Home, Building2, ChevronRight,
} from 'lucide-react';
import { useBasePath } from '../../lib/useBasePath';

const EMPTY_FEES: TestQuoteFeeCategories = {
  packing: [], staff: [], moving: [], other: [],
};

const CAT_META: Record<keyof TestQuoteFeeCategories, { label: string; bg: string; bar: string; icon: any; hint: string }> = {
  packing: { label: '包材類',  bg: 'bg-amber-50',  bar: 'bg-amber-400',  icon: Package, hint: '紙箱、膠帶、氣泡袋等耗材' },
  staff:   { label: '人員類',  bg: 'bg-blue-50',   bar: 'bg-blue-400',   icon: Users,   hint: '整聊師、搬運工計時費用' },
  moving:  { label: '搬運類',  bg: 'bg-purple-50', bar: 'bg-purple-400', icon: Truck,   hint: '搬家車趟、家具組裝、包膜' },
  other:   { label: '其他',    bg: 'bg-gray-50',   bar: 'bg-gray-400',   icon: FileText, hint: '其他費用、加班費、特殊需求' },
};

// ── helpers ─────────────────────────────────────────────────────────────────
function categorizeQuoteItem(it: QuoteItem): keyof TestQuoteFeeCategories {
  const c = it.category ?? '';
  const n = it.name ?? '';
  if (c.includes('包材') || /紙箱|膠帶|氣泡|報紙|包材|捲|包/.test(n)) return 'packing';
  if (c.includes('計時') || /整聊師|搬運工|人員|包材專員|位/.test(n)) return 'staff';
  if (c.includes('搬家車') || c.includes('車趟') || /車趟|搬家車|組裝|包膜|拆裝|趟/.test(n)) return 'moving';
  return 'other';
}

function fmtMoney(n: number) { return `NT$ ${(n ?? 0).toLocaleString()}`; }

function elevatorLabel(v?: string) {
  if (v === 'has') return '有電梯';
  if (v === 'freight') return '有貨梯';
  if (v === 'none') return '無電梯';
  return '—';
}

// ── main ────────────────────────────────────────────────────────────────────
export default function TestQuoteBuilder() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const base = useBasePath();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [schedule, setSchedule] = useState<QuoteScheduleItem[]>([]);
  const [plan, setPlan] = useState<MovingPlan | null>(null);
  const [recordings, setRecordings] = useState<QuoteRecording[]>([]);

  const [tq, setTq] = useState<Partial<TestQuote>>({
    fee_categories: EMPTY_FEES,
    items_not_to_move: [],
    special_protection: [],
    customer_concerns: [],
    internal_notes: '',
    old_basement_height: '',
    new_basement_height: '',
    old_temp_parking: '',
    new_temp_parking: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const initRef = useRef(false);

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [quoteId]);

  async function load() {
    if (!quoteId) return;
    setLoading(true);

    const [qRes, sRes, pRes, rRes, tRes] = await Promise.all([
      supabase.from(T.quotes).select('*, quote_items(*)').eq('id', quoteId).maybeSingle(),
      supabase.from(T.quoteSchedule).select('*').eq('quote_id', quoteId).order('work_date').order('start_time'),
      supabase.from(T.movingPlans).select('*').eq('quote_id', quoteId).maybeSingle(),
      supabase.from(T.quoteRecordings).select('*').eq('quote_id', quoteId).order('created_at', { ascending: false }),
      supabase.from(T.testQuotes).select('*').eq('quote_id', quoteId).maybeSingle(),
    ]);

    setQuote(qRes.data as Quote);
    setSchedule((sRes.data ?? []) as QuoteScheduleItem[]);
    setPlan(pRes.data as MovingPlan | null);
    setRecordings((rRes.data ?? []) as QuoteRecording[]);

    if (tRes.data) {
      setTq({
        ...tRes.data,
        fee_categories: tRes.data.fee_categories ?? EMPTY_FEES,
        items_not_to_move: tRes.data.items_not_to_move ?? [],
        special_protection: tRes.data.special_protection ?? [],
        customer_concerns: tRes.data.customer_concerns ?? [],
      });
    } else if (qRes.data && !initRef.current) {
      initRef.current = true;
      const items = ((qRes.data as any).quote_items ?? []) as QuoteItem[];
      const fees: TestQuoteFeeCategories = { packing: [], staff: [], moving: [], other: [] };
      items.forEach(it => {
        fees[categorizeQuoteItem(it)].push({
          name: it.name, qty: it.quantity, unit_price: it.unit_price,
          subtotal: it.unit_price * it.quantity,
        });
      });
      setTq(s => ({ ...s, fee_categories: fees }));
    }

    setLoading(false);
  }

  async function save() {
    if (!quoteId) return;
    setSaving(true);
    const { error } = await supabase
      .from(T.testQuotes)
      .upsert({
        quote_id: quoteId,
        fee_categories: tq.fee_categories ?? EMPTY_FEES,
        old_basement_height: tq.old_basement_height ?? null,
        new_basement_height: tq.new_basement_height ?? null,
        old_temp_parking: tq.old_temp_parking ?? null,
        new_temp_parking: tq.new_temp_parking ?? null,
        items_not_to_move: tq.items_not_to_move ?? [],
        special_protection: tq.special_protection ?? [],
        customer_concerns: tq.customer_concerns ?? [],
        internal_notes: tq.internal_notes ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'quote_id' });
    setSaving(false);
    if (error) alert('儲存失敗：' + error.message);
    else alert('已儲存');
  }

  function fillFromRecording() {
    const r = recordings.find(x => x.extracted_data);
    if (!r?.extracted_data) { alert('沒有可用的錄音資料'); return; }
    const d = r.extracted_data;
    const notes = Array.isArray(d.notes) ? d.notes : (d.notes ? [d.notes] : []);
    setTq(s => ({
      ...s,
      customer_concerns: Array.from(new Set([...(s.customer_concerns ?? []), ...notes])),
      old_basement_height: s.old_basement_height || d.address_from_basement || '',
      new_basement_height: s.new_basement_height || d.address_to_basement || '',
      old_temp_parking:    s.old_temp_parking    || d.address_from_parking  || '',
      new_temp_parking:    s.new_temp_parking    || d.address_to_parking    || '',
    }));
    alert(`已從錄音「${r.title}」帶入資料`);
  }

  function copyAsText() {
    if (!quote) return;
    const fees = tq.fee_categories ?? EMPTY_FEES;
    const lines: string[] = [];
    lines.push(`【步步搬家｜報價單 ${quote.quote_number}】`);
    lines.push(`客戶：${quote.customer_name}　電話：${quote.phone}`);
    lines.push(`舊家：${quote.address_from ?? '—'}`);
    lines.push(`新家：${quote.address_to ?? '—'}`);
    lines.push('');
    if (schedule.length) {
      lines.push('━━ 行程表 ━━');
      schedule.forEach(s => {
        lines.push(`${s.work_date} ${s.start_time}${s.end_time && s.end_time !== s.start_time ? `–${s.end_time}` : ''}　${s.label}`);
      });
      lines.push('');
    }
    (Object.keys(CAT_META) as (keyof TestQuoteFeeCategories)[]).forEach(cat => {
      const list = fees[cat];
      if (!list?.length) return;
      lines.push(`━━ ${CAT_META[cat].label} ━━`);
      list.forEach(it => {
        const qty = `${it.qty}${it.unit ?? ''}`;
        const hr = it.hours ? ` × ${it.hours}小時` : '';
        const sub = it.subtotal ? `　＝ ${fmtMoney(it.subtotal)}` : '';
        lines.push(`・${it.name}　${qty}${hr}${sub}`);
      });
      lines.push('');
    });
    const total = (Object.keys(fees) as (keyof TestQuoteFeeCategories)[])
      .flatMap(k => fees[k]).reduce((s, it) => s + (it.subtotal ?? 0), 0);
    lines.push(`合計：${fmtMoney(total)}`);
    navigator.clipboard.writeText(lines.join('\n'));
    alert('已複製到剪貼簿');
  }

  // ── fee item editing ──────────────────────────────────────────────────────
  function updateFee(cat: keyof TestQuoteFeeCategories, idx: number, patch: Partial<TestQuoteFeeItem>) {
    setTq(s => {
      const fees = { ...(s.fee_categories ?? EMPTY_FEES) };
      const list = [...(fees[cat] ?? [])];
      list[idx] = { ...list[idx], ...patch };
      const it = list[idx];
      if (cat === 'staff' && it.unit_price && it.qty && it.hours) {
        list[idx] = { ...it, subtotal: it.unit_price * it.qty * it.hours };
      } else if (it.unit_price && it.qty) {
        list[idx] = { ...it, subtotal: it.unit_price * it.qty };
      }
      fees[cat] = list;
      return { ...s, fee_categories: fees };
    });
  }
  function addFee(cat: keyof TestQuoteFeeCategories) {
    setTq(s => {
      const fees = { ...(s.fee_categories ?? EMPTY_FEES) };
      fees[cat] = [...(fees[cat] ?? []), { name: '', qty: 1 }];
      return { ...s, fee_categories: fees };
    });
  }
  function rmFee(cat: keyof TestQuoteFeeCategories, idx: number) {
    setTq(s => {
      const fees = { ...(s.fee_categories ?? EMPTY_FEES) };
      fees[cat] = (fees[cat] ?? []).filter((_, i) => i !== idx);
      return { ...s, fee_categories: fees };
    });
  }

  if (loading) return <div className="p-8 text-center text-gray-400">載入中…</div>;
  if (!quote) return <div className="p-8 text-center text-red-500">找不到報價單</div>;

  const fees = tq.fee_categories ?? EMPTY_FEES;
  const catTotals = (Object.keys(fees) as (keyof TestQuoteFeeCategories)[])
    .map(k => ({ k, total: fees[k].reduce((s, it) => s + (it.subtotal ?? 0), 0) }));
  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0);

  // group schedule by date
  const scheduleByDate: Record<string, QuoteScheduleItem[]> = {};
  schedule.forEach(s => {
    (scheduleByDate[s.work_date] ??= []).push(s);
  });
  const dateKeys = Object.keys(scheduleByDate).sort();

  return (
    <div className="max-w-5xl mx-auto pb-32 lg:pb-6 print:pb-0">
      {/* Top toolbar — hidden on print */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div>
          <button
            onClick={() => navigate(`${base}/test-quotes`)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
          >
            <ArrowLeft size={14} /> 返回列表
          </button>
          <h1 className="text-2xl font-bold text-gray-900">測試報價單</h1>
          <p className="text-sm text-gray-500 mt-1">
            {quote.quote_number} · {quote.customer_name}
          </p>
        </div>
        <div className="hidden lg:flex flex-wrap gap-2">
          <button onClick={() => setPreviewMode(p => !p)}
            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-sm flex items-center gap-2">
            {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
            {previewMode ? '編輯模式' : '客戶預覽'}
          </button>
          <button onClick={copyAsText}
            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-sm flex items-center gap-2">
            <Copy size={16} /> 複製文字
          </button>
          <button onClick={() => window.print()}
            className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-sm flex items-center gap-2">
            <Printer size={16} /> 列印 / PDF
          </button>
          {recordings.some(r => r.extracted_data) && (
            <button onClick={fillFromRecording}
              className="px-3 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm flex items-center gap-2">
              <Sparkles size={16} /> 從錄音帶入
            </button>
          )}
          <button onClick={save} disabled={saving}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 text-sm flex items-center gap-2">
            <Save size={16} /> {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>

      {/* ── Document Header ─────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-2xl p-5 sm:p-6 mb-4 print:rounded-none print:bg-brand-500">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs opacity-80">步步搬家｜報價單</div>
            <div className="font-mono text-sm mt-0.5">{quote.quote_number}</div>
            <h2 className="text-2xl font-bold mt-2">{quote.customer_name} 您好</h2>
            <p className="text-sm opacity-90 mt-1">以下是本次搬家的完整安排與費用明細</p>
          </div>
          <div className="text-right text-sm">
            <div className="opacity-80">客戶電話</div>
            <div className="font-medium">{quote.phone}</div>
            {quote.email && (
              <>
                <div className="opacity-80 mt-2">Email</div>
                <div className="font-medium">{quote.email}</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ① 行程表 — Visual Timeline */}
      <Card icon={<Calendar size={18} />} title="完整行程表" subtitle="日期、時間、進行的事項">
        {dateKeys.length === 0 ? (
          <EmptyHint text="尚未建立行程，請至報價單頁面新增作業排程" />
        ) : (
          <div className="space-y-4">
            {dateKeys.map(date => (
              <div key={date} className="border-l-2 border-brand-300 pl-4 relative">
                <div className="absolute -left-2 top-0 w-3 h-3 bg-brand-500 rounded-full" />
                <div className="text-xs font-semibold text-brand-700 mb-1">{date}</div>
                <div className="space-y-1.5">
                  {scheduleByDate[date].map((s, i) => (
                    <div key={s.id ?? i} className="flex items-baseline gap-3 text-sm">
                      <span className="font-mono text-gray-500 w-24 flex-shrink-0">
                        {s.start_time}
                        {s.end_time && s.end_time !== s.start_time ? `–${s.end_time}` : ''}
                      </span>
                      <span className="font-medium text-gray-900">{s.label}</span>
                      {s.category && <span className="text-xs text-gray-400">{s.category}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ② 收費項目 — 4 categories with bar */}
      <Card icon={<Package size={18} />} title="收費項目明細" subtitle="包材／人員／搬運／其他">
        <div className="space-y-3">
          {(Object.keys(CAT_META) as (keyof TestQuoteFeeCategories)[]).map(cat => {
            const meta = CAT_META[cat];
            const list = fees[cat] ?? [];
            const subtotal = list.reduce((s, it) => s + (it.subtotal ?? 0), 0);
            const Icon = meta.icon;
            return (
              <div key={cat} className={`rounded-xl border border-gray-200 overflow-hidden`}>
                <div className={`flex items-center justify-between px-3 py-2 ${meta.bg}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${meta.bar} flex items-center justify-center text-white`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{meta.label}</div>
                      <div className="text-xs text-gray-500">{meta.hint}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{fmtMoney(subtotal)}</div>
                </div>
                {list.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {list.map((it, idx) => (
                      <FeeRow
                        key={idx} cat={cat} it={it} disabled={previewMode}
                        onChange={p => updateFee(cat, idx, p)}
                        onRemove={() => rmFee(cat, idx)}
                      />
                    ))}
                  </div>
                )}
                {!previewMode && (
                  <button onClick={() => addFee(cat)}
                    className="w-full px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center justify-center gap-1 border-t border-gray-100">
                    <Plus size={14} /> 新增{meta.label}項目
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {/* Grand total */}
        <div className="mt-4 pt-4 border-t-2 border-gray-900 flex justify-between items-baseline">
          <span className="text-sm text-gray-600">合計（含所有類別）</span>
          <span className="text-2xl font-bold text-brand-600">{fmtMoney(grandTotal)}</span>
        </div>
      </Card>

      {/* ④ 搬家地點細節 — Side-by-side cards */}
      <Card icon={<MapPin size={18} />} title="搬家地點細節" subtitle="現場狀況、停車、電梯、地下室">
        <div className="grid sm:grid-cols-2 gap-3">
          <AddressCard
            kind="old"
            address={quote.address_from} type={quote.address_from_type}
            elevator={plan?.estimation?.old_elevator}
            parking={quote.address_from_parking} basement={quote.address_from_basement}
            guard={quote.address_from_guard}
            tempParking={tq.old_temp_parking ?? ''}
            basementHeight={tq.old_basement_height ?? ''}
            disabled={previewMode}
            onTempParking={v => setTq(s => ({ ...s, old_temp_parking: v }))}
            onBasementHeight={v => setTq(s => ({ ...s, old_basement_height: v }))}
          />
          <AddressCard
            kind="new"
            address={quote.address_to} type={quote.address_to_type}
            elevator={plan?.estimation?.new_elevator}
            parking={quote.address_to_parking} basement={quote.address_to_basement}
            guard={quote.address_to_guard}
            tempParking={tq.new_temp_parking ?? ''}
            basementHeight={tq.new_basement_height ?? ''}
            disabled={previewMode}
            onTempParking={v => setTq(s => ({ ...s, new_temp_parking: v }))}
            onBasementHeight={v => setTq(s => ({ ...s, new_basement_height: v }))}
          />
        </div>
      </Card>

      {/* ⑤ 物品處理細節 */}
      <Card icon={<AlertCircle size={18} />} title="物品處理細節" subtitle="不搬走的物品、需特殊保護的物品">
        <div className="grid sm:grid-cols-2 gap-3">
          <ItemListEditor
            heading="不搬走的物品"
            sub="客戶留下、丟棄或自行處理的物品"
            tone="rose"
            items={tq.items_not_to_move ?? []}
            extraField={{ key: 'reason', label: '原因', placeholder: '例：留給房東、不要了' }}
            placeholder="例：床墊、沙發"
            disabled={previewMode}
            onChange={v => setTq(s => ({ ...s, items_not_to_move: v }))}
          />
          <ItemListEditor
            heading="特殊保護物品"
            sub="易碎、貴重、有獨特保護需求"
            tone="emerald"
            items={tq.special_protection ?? []}
            extraField={{ key: 'method', label: '保護方式', placeholder: '例：氣泡袋包覆、木箱' }}
            placeholder="例：水晶洞、神桌、藝術品"
            disabled={previewMode}
            onChange={v => setTq(s => ({ ...s, special_protection: v }))}
          />
        </div>
      </Card>

      {/* ⑥ 客戶在意的點 */}
      <Card icon={<Heart size={18} />} title="客戶在意 / 特殊狀況" subtitle="寵物、外出時段、進出限制等">
        <ConcernsList
          items={tq.customer_concerns ?? []}
          disabled={previewMode}
          onChange={v => setTq(s => ({ ...s, customer_concerns: v }))}
        />
      </Card>

      {/* ⑦ 內部備註 — admin only */}
      {!previewMode && (
        <Card
          icon={<Lock size={18} />}
          title="內部備註"
          subtitle="僅工作人員可見，不會出現在客戶版面"
          accent="border-red-200 bg-red-50/40"
        >
          <textarea
            value={tq.internal_notes ?? ''}
            onChange={e => setTq(s => ({ ...s, internal_notes: e.target.value }))}
            rows={5}
            className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
            placeholder="例：客戶對搬運工有疑慮、預估會超時、需要事先打預防針的事情…"
          />
        </Card>
      )}

      {/* Mobile bottom bar */}
      {createPortal(
        <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-3 py-2 flex gap-2 z-40 print:hidden"
             style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          <button onClick={() => setPreviewMode(p => !p)}
            className="flex-1 px-2 py-2 rounded-xl border border-gray-300 text-sm font-medium">
            {previewMode ? '編輯' : '預覽'}
          </button>
          <button onClick={copyAsText}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm">
            <Copy size={16} />
          </button>
          {recordings.some(r => r.extracted_data) && (
            <button onClick={fillFromRecording}
              className="px-3 py-2 rounded-xl border border-purple-300 bg-purple-50 text-purple-700 text-sm">
              <Sparkles size={16} />
            </button>
          )}
          <button onClick={save} disabled={saving}
            className="flex-1 px-3 py-2 rounded-xl bg-brand-500 text-white text-sm font-medium disabled:opacity-50">
            {saving ? '儲存中' : '儲存'}
          </button>
        </div>,
        document.body
      )}

      <style>{`
        @media print {
          body { background: white; }
          aside, header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub components ────────────────────────────────────────────────────────

function Card({
  icon, title, subtitle, accent, children,
}: { icon: React.ReactNode; title: string; subtitle?: string; accent?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-2xl border ${accent ?? 'border-gray-200'} p-4 sm:p-5 mb-4 print:break-inside-avoid`}>
      <div className="mb-3 pb-3 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
            {icon}
          </span>
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1 ml-9">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-4">{text}</p>;
}

function FeeRow({
  cat, it, disabled, onChange, onRemove,
}: {
  cat: keyof TestQuoteFeeCategories; it: TestQuoteFeeItem; disabled?: boolean;
  onChange: (p: Partial<TestQuoteFeeItem>) => void; onRemove: () => void;
}) {
  return (
    <div className="px-3 py-2 grid grid-cols-12 gap-2 items-center text-sm hover:bg-gray-50">
      <input
        className="col-span-12 sm:col-span-4 px-2 py-1 border rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent disabled:px-0"
        placeholder="名稱（如：大紙箱）"
        value={it.name} disabled={disabled}
        onChange={e => onChange({ name: e.target.value })}
      />
      <input
        type="number"
        className="col-span-3 sm:col-span-1 px-2 py-1 border rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent"
        placeholder="數量" value={it.qty || ''} disabled={disabled}
        onChange={e => onChange({ qty: Number(e.target.value) || 0 })}
      />
      <input
        className="col-span-3 sm:col-span-1 px-2 py-1 border rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent"
        placeholder="單位" value={it.unit ?? ''} disabled={disabled}
        onChange={e => onChange({ unit: e.target.value })}
      />
      {cat === 'staff' ? (
        <input
          type="number"
          className="col-span-3 sm:col-span-1 px-2 py-1 border rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent"
          placeholder="時數" value={it.hours || ''} disabled={disabled}
          onChange={e => onChange({ hours: Number(e.target.value) || 0 })}
        />
      ) : (
        <div className="hidden sm:block sm:col-span-1" />
      )}
      <input
        type="number"
        className="col-span-3 sm:col-span-2 px-2 py-1 border rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent"
        placeholder="單價" value={it.unit_price || ''} disabled={disabled}
        onChange={e => onChange({ unit_price: Number(e.target.value) || 0 })}
      />
      <div className="col-span-9 sm:col-span-2 text-right text-sm font-semibold text-gray-900">
        {fmtMoney(it.subtotal ?? 0)}
      </div>
      {!disabled && (
        <button className="col-span-3 sm:col-span-1 text-red-400 hover:text-red-600 flex justify-end"
                onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function AddressCard({
  kind, address, type, elevator, parking, basement, guard,
  tempParking, basementHeight, disabled, onTempParking, onBasementHeight,
}: any) {
  const isOld = kind === 'old';
  const Icon = isOld ? Home : Building2;
  const heading = isOld ? '舊家（搬出）' : '新家（搬入）';
  const tone = isOld ? 'border-amber-200 bg-amber-50/30' : 'border-green-200 bg-green-50/30';
  return (
    <div className={`rounded-xl border ${tone} p-3`}>
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-current/10">
        <Icon size={18} className={isOld ? 'text-amber-600' : 'text-green-600'} />
        <div className="font-semibold text-gray-900">{heading}</div>
      </div>
      <div className="text-sm font-medium text-gray-900 mb-2">{address || '—'}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-3">
        <Field k="類型" v={type || '—'} />
        <Field k="電梯" v={elevatorLabel(elevator)} />
        <Field k="管理室" v={guard || '—'} />
        <Field k="停車" v={parking || '—'} />
        <Field k="地下室" v={basement || '—'} className="col-span-2" />
      </div>
      <div className="space-y-2 pt-2 border-t border-current/10">
        <FieldInput
          label="是否有臨停區" value={tempParking} disabled={disabled}
          placeholder="例：路邊可臨停 15 分鐘"
          onChange={onTempParking}
        />
        <FieldInput
          label="地下室高度" value={basementHeight} disabled={disabled}
          placeholder="例：B1 高度 2.2M / 限高 2M"
          onChange={onBasementHeight}
        />
      </div>
    </div>
  );
}

function Field({ k, v, className }: { k: string; v: string; className?: string }) {
  return (
    <div className={className}>
      <span className="text-gray-500">{k}：</span>
      <span className="text-gray-900">{v}</span>
    </div>
  );
}

function FieldInput({ label, value, disabled, placeholder, onChange }: any) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
      <input
        value={value} disabled={disabled} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white disabled:bg-transparent disabled:border-transparent disabled:px-0"
      />
    </div>
  );
}

function ItemListEditor({
  heading, sub, tone, placeholder, items, extraField, disabled, onChange,
}: any) {
  const toneCls = tone === 'rose'
    ? 'border-rose-200 bg-rose-50/30'
    : 'border-emerald-200 bg-emerald-50/30';
  return (
    <div className={`rounded-xl border ${toneCls} p-3`}>
      <div className="font-semibold text-gray-900">{heading}</div>
      {sub && <p className="text-xs text-gray-500 mb-2">{sub}</p>}
      <div className="space-y-2">
        {items.map((it: any, idx: number) => (
          <div key={idx} className="grid grid-cols-12 gap-2 bg-white rounded-lg p-2">
            <input
              className="col-span-5 px-2 py-1 border rounded text-sm disabled:bg-transparent disabled:border-transparent disabled:px-0"
              placeholder={placeholder}
              value={it.name} disabled={disabled}
              onChange={e => {
                const next = [...items]; next[idx] = { ...next[idx], name: e.target.value }; onChange(next);
              }}
            />
            <input
              className="col-span-6 px-2 py-1 border rounded text-sm disabled:bg-transparent disabled:border-transparent disabled:px-0"
              placeholder={extraField.placeholder}
              value={it[extraField.key] ?? ''} disabled={disabled}
              onChange={e => {
                const next = [...items]; next[idx] = { ...next[idx], [extraField.key]: e.target.value }; onChange(next);
              }}
            />
            {!disabled && (
              <button className="col-span-1 text-red-400 hover:text-red-600 flex justify-center"
                      onClick={() => onChange(items.filter((_: any, i: number) => i !== idx))}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-gray-400 py-1">尚未新增項目</p>}
      </div>
      {!disabled && (
        <button onClick={() => onChange([...items, { name: '', [extraField.key]: '' }])}
          className="mt-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <Plus size={14} /> 新增
        </button>
      )}
    </div>
  );
}

function ConcernsList({ items, disabled, onChange }: any) {
  return (
    <div className="space-y-2">
      {items.map((v: string, idx: number) => (
        <div key={idx} className="flex items-center gap-2 bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-2">
          <Heart size={14} className="text-pink-400 flex-shrink-0" />
          <input
            className="flex-1 bg-transparent border-none focus:outline-none text-sm"
            placeholder="例：寵物在籠中，不要驚擾"
            value={v} disabled={disabled}
            onChange={e => {
              const next = [...items]; next[idx] = e.target.value; onChange(next);
            }}
          />
          {!disabled && (
            <button className="text-red-400 hover:text-red-600"
                    onClick={() => onChange(items.filter((_: any, i: number) => i !== idx))}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-2">尚未紀錄客戶在意的事項</p>}
      {!disabled && (
        <button onClick={() => onChange([...items, ''])}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
          <Plus size={14} /> 新增
        </button>
      )}
    </div>
  );
}
