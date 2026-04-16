import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Plus, Trash2, Download } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SheetHeader {
  customer_name: string;
  consultant_name: string;
  move_datetime: string;
  address_old: string;
  address_new: string;
  notes: string;
}

interface WorkItem {
  _key: string;
  name: string;
  unit_price: number;
  actual_qty: number;
}

interface SupplyItem {
  _key: string;
  name: string;
  unit_price: number;
  estimated_qty: number;
  actual_qty: number;
}

const mkKey = () => Math.random().toString(36).slice(2);

// ─── Numeric Input Helper ───────────────────────────────────────────────────

function numVal(
  value: number,
  onChange: (v: number) => void,
  cls = ''
): React.InputHTMLAttributes<HTMLInputElement> {
  return {
    type: 'text',
    inputMode: 'numeric',
    value: value === 0 ? '' : String(value),
    onChange: (e) => {
      const cleaned = e.target.value.replace(/^0+(?=\d)/, '').replace(/[^\d.]/g, '');
      onChange(parseFloat(cleaned) || 0);
    },
    onBlur: (e) => { if (!e.target.value) onChange(0); },
    className: `w-full text-right px-1 py-0.5 border-b border-gray-300 focus:border-brand-400 focus:outline-none text-sm bg-transparent print:border-0 ${cls}`,
  };
}

// ─── Import Modal ────────────────────────────────────────────────────────────

function ImportModal({
  items,
  onImport,
  onClose,
}: {
  items: any[];
  onImport: (ids: Set<string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const catLabel: Record<string, string> = {
    '搬家車趟費': '→ 作業項目',
    '計時人員': '→ 作業項目',
    '包材費': '→ 耗材',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">從報價單帶入品項</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 max-h-72 overflow-y-auto space-y-2">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">此報價單無品項</p>
          ) : (
            items.map((item) => (
              <label key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    NT${item.unit_price.toLocaleString()} × {item.quantity}
                    <span className="text-brand-600">{catLabel[item.category] ?? '→ 作業項目'}</span>
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">取消</button>
          <button
            onClick={() => onImport(selected)}
            className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-xl"
          >
            帶入 {selected.size} 項
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editable Cell ────────────────────────────────────────────────────────────

function EditCell({
  value,
  onChange,
  placeholder = '',
  wide = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`px-1 py-0.5 border-b border-gray-300 focus:border-brand-400 focus:outline-none text-sm bg-transparent print:border-0 ${wide ? 'w-full' : 'w-full'}`}
    />
  );
}

// ─── Sheet Print Wrapper ─────────────────────────────────────────────────────

interface SheetContentProps {
  header: SheetHeader;
  workItems: WorkItem[];
  supplyItems: SupplyItem[];
  workTotal: number;
  supplyTotal: number;
  grandTotal: number;
  editMode: boolean;
  onHeaderChange: (f: keyof SheetHeader, v: string) => void;
  onWorkChange: (i: number, f: keyof WorkItem, v: any) => void;
  onSupplyChange: (i: number, f: keyof SupplyItem, v: any) => void;
  onAddWork: () => void;
  onAddSupply: () => void;
  onRemoveWork: (i: number) => void;
  onRemoveSupply: (i: number) => void;
}

function SheetContent({
  header, workItems, supplyItems, workTotal, supplyTotal, grandTotal,
  editMode,
  onHeaderChange, onWorkChange, onSupplyChange,
  onAddWork, onAddSupply, onRemoveWork, onRemoveSupply,
}: SheetContentProps) {
  return (
    <div className="font-sans text-sm">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold tracking-wide">步步搬家 費用結算統計表</h2>
      </div>

      {/* Header grid */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-4 border border-gray-300 rounded p-3 print:rounded-none">
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-gray-500">案名：</span>
          {editMode ? (
            <EditCell value={header.customer_name} onChange={(v) => onHeaderChange('customer_name', v)} wide />
          ) : (
            <span className="font-medium">{header.customer_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-gray-500">顧問：</span>
          {editMode ? (
            <EditCell value={header.consultant_name} onChange={(v) => onHeaderChange('consultant_name', v)} />
          ) : (
            <span className="font-medium">{header.consultant_name}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-gray-500">搬遷時間：</span>
          {editMode ? (
            <EditCell value={header.move_datetime} onChange={(v) => onHeaderChange('move_datetime', v)} placeholder="e.g. 2025/01/15 上午" />
          ) : (
            <span className="font-medium">{header.move_datetime}</span>
          )}
        </div>
        <div className="col-span-3 flex items-center gap-1">
          <span className="whitespace-nowrap text-gray-500">舊址：</span>
          {editMode ? (
            <EditCell value={header.address_old} onChange={(v) => onHeaderChange('address_old', v)} wide />
          ) : (
            <span className="font-medium">{header.address_old}</span>
          )}
        </div>
        <div className="col-span-3 flex items-center gap-1">
          <span className="whitespace-nowrap text-gray-500">新址：</span>
          {editMode ? (
            <EditCell value={header.address_new} onChange={(v) => onHeaderChange('address_new', v)} wide />
          ) : (
            <span className="font-medium">{header.address_new}</span>
          )}
        </div>
      </div>

      {/* Two column tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">
        {/* Left: 作業項目 */}
        <div>
          <table className="w-full border border-gray-300 text-xs print:text-xs">
            <thead className="bg-gray-100 print:bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1.5 text-left w-full">作業項目</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">單價</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">實際使用</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">金額</th>
                {editMode && <th className="border border-gray-300 px-1 py-1.5 w-6 print:hidden" />}
              </tr>
            </thead>
            <tbody>
              {workItems.map((item, i) => (
                <tr key={item._key} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1">
                    {editMode ? (
                      <EditCell value={item.name} onChange={(v) => onWorkChange(i, 'name', v)} placeholder="項目名稱" />
                    ) : item.name}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {editMode ? (
                      <input {...numVal(item.unit_price, (v) => onWorkChange(i, 'unit_price', v))} />
                    ) : item.unit_price ? item.unit_price.toLocaleString() : ''}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {editMode ? (
                      <input {...numVal(item.actual_qty, (v) => onWorkChange(i, 'actual_qty', v))} />
                    ) : item.actual_qty || ''}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-medium">
                    {item.unit_price && item.actual_qty ? (item.unit_price * item.actual_qty).toLocaleString() : ''}
                  </td>
                  {editMode && (
                    <td className="border border-gray-200 px-1 py-1 text-center print:hidden">
                      <button onClick={() => onRemoveWork(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {/* Empty rows for printing */}
              {Array.from({ length: Math.max(0, 6 - workItems.length) }).map((_, i) => (
                <tr key={`empty-w-${i}`} className="print:table-row hidden">
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={editMode ? 3 : 3} className="border border-gray-300 px-2 py-1.5 text-right font-medium text-gray-600">
                  含稅金額
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-brand-700">
                  {workTotal > 0 ? `NT$${workTotal.toLocaleString()}` : ''}
                </td>
                {editMode && <td className="border border-gray-300 print:hidden" />}
              </tr>
            </tfoot>
          </table>
          {editMode && (
            <button
              onClick={onAddWork}
              className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 print:hidden"
            >
              <Plus size={13} />新增作業項目
            </button>
          )}
        </div>

        {/* Right: 耗材 */}
        <div>
          <table className="w-full border border-gray-300 text-xs print:text-xs">
            <thead className="bg-gray-100 print:bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1.5 text-left w-full">耗材</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">單價</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">預估數量</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">實際使用</th>
                <th className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">金額</th>
                {editMode && <th className="border border-gray-300 px-1 py-1.5 w-6 print:hidden" />}
              </tr>
            </thead>
            <tbody>
              {supplyItems.map((item, i) => (
                <tr key={item._key} className="hover:bg-gray-50">
                  <td className="border border-gray-200 px-2 py-1">
                    {editMode ? (
                      <EditCell value={item.name} onChange={(v) => onSupplyChange(i, 'name', v)} placeholder="耗材名稱" />
                    ) : item.name}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {editMode ? (
                      <input {...numVal(item.unit_price, (v) => onSupplyChange(i, 'unit_price', v))} />
                    ) : item.unit_price ? item.unit_price.toLocaleString() : ''}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {editMode ? (
                      <input {...numVal(item.estimated_qty, (v) => onSupplyChange(i, 'estimated_qty', v))} />
                    ) : item.estimated_qty || ''}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right">
                    {editMode ? (
                      <input {...numVal(item.actual_qty, (v) => onSupplyChange(i, 'actual_qty', v))} />
                    ) : item.actual_qty || ''}
                  </td>
                  <td className="border border-gray-200 px-2 py-1 text-right font-medium">
                    {item.unit_price && item.actual_qty ? (item.unit_price * item.actual_qty).toLocaleString() : ''}
                  </td>
                  {editMode && (
                    <td className="border border-gray-200 px-1 py-1 text-center print:hidden">
                      <button onClick={() => onRemoveSupply(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 8 - supplyItems.length) }).map((_, i) => (
                <tr key={`empty-s-${i}`} className="print:table-row hidden">
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                  <td className="border border-gray-200 px-2 py-1">&nbsp;</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={editMode ? 4 : 4} className="border border-gray-300 px-2 py-1.5 text-right font-medium text-gray-600">
                  含稅金額
                </td>
                <td className="border border-gray-300 px-2 py-1.5 text-right font-bold text-brand-700">
                  {supplyTotal > 0 ? `NT$${supplyTotal.toLocaleString()}` : ''}
                </td>
                {editMode && <td className="border border-gray-300 print:hidden" />}
              </tr>
            </tfoot>
          </table>
          {editMode && (
            <button
              onClick={onAddSupply}
              className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 print:hidden"
            >
              <Plus size={13} />新增耗材
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 border border-gray-300 rounded p-3 print:rounded-none">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div>
            <span className="text-gray-500 text-xs">含稅總金額</span>
            <p className="text-xl font-bold text-brand-700">
              {grandTotal > 0 ? `NT$${grandTotal.toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4">師傅簽收</p>
            <div className="border-b border-gray-400 mx-4" />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-4">整聊師簽收</p>
            <div className="border-b border-gray-400 mx-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettlementSheet() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const location = useLocation();
  const isConsultant = location.pathname.startsWith('/consultant');

  const [sheetId, setSheetId] = useState<string | null>(null);
  const [header, setHeader] = useState<SheetHeader>({
    customer_name: '', consultant_name: '',
    move_datetime: '', address_old: '', address_new: '', notes: '',
  });
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [quoteItemsForImport, setQuoteItemsForImport] = useState<any[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!quoteId) return;
    loadSheet();
  }, [quoteId]);

  const loadSheet = async () => {
    setLoading(true);

    // Fetch quote info
    const { data: quote } = await supabase.from(T.quotes)
      .select('quote_number, customer_name, consultant_name, address_from, address_to')
      .eq('id', quoteId!)
      .maybeSingle();
    if (quote?.quote_number) setQuoteNumber(quote.quote_number);

    // Find or create settlement sheet
    let { data: sheet } = await supabase.from(T.settlementSheets)
      .select('*').eq('quote_id', quoteId!).maybeSingle();

    if (!sheet) {
      const { data: newSheet } = await supabase.from(T.settlementSheets).insert({
        quote_id: quoteId,
        customer_name: quote?.customer_name ?? '',
        consultant_name: quote?.consultant_name ?? '',
        address_old: quote?.address_from ?? '',
        address_new: quote?.address_to ?? '',
      }).select().single();
      sheet = newSheet;
    }

    if (sheet) {
      setSheetId(sheet.id);
      setHeader({
        customer_name: sheet.customer_name ?? '',
        consultant_name: sheet.consultant_name ?? '',
        move_datetime: sheet.move_datetime ?? '',
        address_old: sheet.address_old ?? '',
        address_new: sheet.address_new ?? '',
        notes: sheet.notes ?? '',
      });

      const { data: items } = await supabase.from(T.settlementItems)
        .select('*').eq('sheet_id', sheet.id).order('sort_order');

      const work: WorkItem[] = [];
      const supply: SupplyItem[] = [];
      (items ?? []).forEach((item: any) => {
        if (item.section === 'work') {
          work.push({ _key: item.id, name: item.name, unit_price: item.unit_price, actual_qty: item.actual_qty });
        } else {
          supply.push({ _key: item.id, name: item.name, unit_price: item.unit_price, estimated_qty: item.estimated_qty, actual_qty: item.actual_qty });
        }
      });
      setWorkItems(work);
      setSupplyItems(supply);
    }
    setLoading(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!sheetId) return;
    setSaving(true);
    try {
      await supabase.from(T.settlementSheets).update({
        ...header,
        updated_at: new Date().toISOString(),
      }).eq('id', sheetId);

      await supabase.from(T.settlementItems).delete().eq('sheet_id', sheetId);

      const allItems = [
        ...workItems.map((item, i) => ({
          sheet_id: sheetId, section: 'work',
          name: item.name, unit_price: item.unit_price,
          estimated_qty: 0, actual_qty: item.actual_qty, sort_order: i,
        })),
        ...supplyItems.map((item, i) => ({
          sheet_id: sheetId, section: 'supply',
          name: item.name, unit_price: item.unit_price,
          estimated_qty: item.estimated_qty, actual_qty: item.actual_qty,
          sort_order: workItems.length + i,
        })),
      ];
      if (allItems.length > 0) await supabase.from(T.settlementItems).insert(allItems);

      setSavedMsg('已儲存');
      setTimeout(() => setSavedMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  // ── Import from quote ─────────────────────────────────────────────────────

  const openImport = async () => {
    setLoadingImport(true);
    const { data } = await supabase.from(T.quoteItems).select('*').eq('quote_id', quoteId!).order('sort_order');
    setQuoteItemsForImport(data ?? []);
    setLoadingImport(false);
    setShowImport(true);
  };

  const handleImport = (ids: Set<string>) => {
    const selected = quoteItemsForImport.filter((i) => ids.has(i.id));
    const newWork: WorkItem[] = [];
    const newSupply: SupplyItem[] = [];
    selected.forEach((item) => {
      if (item.category === '包材費') {
        newSupply.push({ _key: mkKey(), name: item.name, unit_price: item.unit_price, estimated_qty: item.quantity, actual_qty: 0 });
      } else {
        newWork.push({ _key: mkKey(), name: item.name, unit_price: item.unit_price, actual_qty: item.quantity });
      }
    });
    setWorkItems((p) => [...p, ...newWork]);
    setSupplyItems((p) => [...p, ...newSupply]);
    setShowImport(false);
  };

  // ── Mutators ──────────────────────────────────────────────────────────────

  const setHeaderField = (f: keyof SheetHeader, v: string) =>
    setHeader((p) => ({ ...p, [f]: v }));

  const setWork = (i: number, f: keyof WorkItem, v: any) =>
    setWorkItems((p) => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  const setSupply = (i: number, f: keyof SupplyItem, v: any) =>
    setSupplyItems((p) => p.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  const addWork = () => setWorkItems((p) => [...p, { _key: mkKey(), name: '', unit_price: 0, actual_qty: 0 }]);
  const addSupply = () => setSupplyItems((p) => [...p, { _key: mkKey(), name: '', unit_price: 0, estimated_qty: 0, actual_qty: 0 }]);
  const removeWork = (i: number) => setWorkItems((p) => p.filter((_, idx) => idx !== i));
  const removeSupply = (i: number) => setSupplyItems((p) => p.filter((_, idx) => idx !== i));

  // ── Totals ────────────────────────────────────────────────────────────────

  const workTotal = workItems.reduce((s, i) => s + (i.unit_price || 0) * (i.actual_qty || 0), 0);
  const supplyTotal = supplyItems.reduce((s, i) => s + (i.unit_price || 0) * (i.actual_qty || 0), 0);
  const grandTotal = workTotal + supplyTotal;

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-12 text-center text-gray-400">載入中...</div>;

  const backPath = isConsultant ? '/consultant/dashboard' : '/admin/quotes';

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #settlement-print-area, #settlement-print-area * { visibility: visible; }
          #settlement-print-area { position: fixed; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:table-row { display: table-row !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:border-none { border: none !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:bg-gray-100 { background-color: #f3f4f6 !important; print-color-adjust: exact; }
          .print\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .print\\:text-xs { font-size: 0.75rem !important; }
          input { border: none !important; outline: none !important; }
        }
      `}</style>

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <Link to={backPath} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={16} />返回
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-800">費用結算統計表</h1>
              {quoteNumber && <p className="text-xs text-gray-400 font-mono mt-0.5">報價單 {quoteNumber}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openImport}
              disabled={loadingImport}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download size={14} />{loadingImport ? '載入中...' : '從報價單帶入品項'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors"
            >
              <Save size={14} />
              {saving ? '儲存中...' : savedMsg || '儲存'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer size={14} />列印
            </button>
          </div>
        </div>

        {/* Sheet */}
        <div id="settlement-print-area" className="bg-white rounded-2xl border border-gray-100 p-6 print:p-4">
          <SheetContent
            header={header}
            workItems={workItems}
            supplyItems={supplyItems}
            workTotal={workTotal}
            supplyTotal={supplyTotal}
            grandTotal={grandTotal}
            editMode={true}
            onHeaderChange={setHeaderField}
            onWorkChange={setWork}
            onSupplyChange={setSupply}
            onAddWork={addWork}
            onAddSupply={addSupply}
            onRemoveWork={removeWork}
            onRemoveSupply={removeSupply}
          />
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <ImportModal
          items={quoteItemsForImport}
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </>
  );
}
