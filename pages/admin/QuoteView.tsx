import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Edit, Send } from 'lucide-react';
import { supabase, Quote, NoteTemplate, StaffScheduleItem, QuoteScheduleItem, T } from '../../lib/supabase';

const CATEGORIES = ['搬家車趟費', '計時人員', '包材費'];

const CAT_COLORS: Record<string, string> = {
  '搬運': '#3B82F6',
  '整理': '#10B981',
  '清潔': '#F59E0B',
  '其他': '#8B5CF6',
};

const toMin = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

const fmtTime = (t: string) => t.slice(0, 5);

const calcHours = (start: string, end: string, breakHours = 0) =>
  Math.max(0, (toMin(end) - toMin(start)) / 60 - breakHours);

// ── Gantt row packing: put non-overlapping items on the same row ──────────────
const packIntoRows = (items: QuoteScheduleItem[]): QuoteScheduleItem[][] => {
  const sorted = [...items].sort((a, b) => toMin(a.start_time) - toMin(b.start_time));
  const rows: QuoteScheduleItem[][] = [];
  for (const item of sorted) {
    const itemStart = toMin(item.start_time);
    const itemEnd = toMin(item.end_time);
    let placed = false;
    for (const row of rows) {
      const hasOverlap = row.some(r =>
        itemStart < toMin(r.end_time) && itemEnd > toMin(r.start_time)
      );
      if (!hasOverlap) {
        row.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) rows.push([item]);
  }
  return rows;
};

export default function QuoteView() {
  const { quoteId } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkedNotes, setCheckedNotes] = useState<NoteTemplate[]>([]);
  const [staffItems, setStaffItems] = useState<StaffScheduleItem[]>([]);
  const [scheduleItems, setScheduleItems] = useState<QuoteScheduleItem[]>([]);
  const [remarkNotes, setRemarkNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from(T.quotes)
        .select(`*, quote_items:${T.quoteItems}(*), quote_checked_notes:${T.checkedNotes}(note_id, quote_note_templates:${T.noteTemplates}(content, sort_order))`)
        .eq('id', quoteId!)
        .single();
      if (data) {
        setQuote(data as Quote);
        const notes = (data.quote_checked_notes ?? [])
          .map((n: any) => n.quote_note_templates)
          .filter(Boolean)
          .sort((a: any, b: any) => a.sort_order - b.sort_order);
        setCheckedNotes(notes);
        try {
          const parsed = JSON.parse(data.remark_notes ?? '[]');
          setRemarkNotes(Array.isArray(parsed) ? parsed.filter((s: string) => s.trim()) : []);
        } catch { setRemarkNotes([]); }
      }

      const { data: staffData } = await supabase.from(T.staffSchedule)
        .select('*').eq('quote_id', quoteId!).order('sort_order');
      if (staffData) setStaffItems(staffData as StaffScheduleItem[]);

      const { data: schedData } = await supabase.from(T.quoteSchedule)
        .select('*').eq('quote_id', quoteId!).order('sort_order');
      if (schedData) setScheduleItems(schedData as QuoteScheduleItem[]);

      setLoading(false);
    };
    load();
  }, [quoteId]);

  const handlePrint = () => window.print();

  const handleSendEmail = async () => {
    if (!quote?.email) { alert('此報價單沒有填寫 E-mail，無法發送'); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-quote-email', { body: { quote_id: quoteId } });
      if (error) throw error;
      await supabase.from(T.quotes).update({ status: '已發送' }).eq('id', quoteId!);
      setQuote(q => q ? { ...q, status: '已發送' } : q);
      alert('報價單已成功寄出！');
    } catch (e: any) {
      alert(`發送失敗：${e.message ?? '請檢查 Edge Function 設定'}`);
    } finally { setSending(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent" />
    </div>
  );
  if (!quote) return <div className="p-8 text-center text-gray-400">找不到此報價單</div>;

  const today = new Date().toLocaleDateString('zh-TW');

  // Only non-計時人員 items come from quote_items; staff costs from staffItems
  const catItems = (cat: string) => {
    if (cat === '計時人員') return [];
    return (quote.quote_items ?? []).filter(i => i.category === cat || (cat === '計時人員' && i.category === '打包計時人員'));
  };
  const catTotal = (cat: string) => catItems(cat).reduce((s, i) => s + i.unit_price * i.quantity, 0);

  const staffTotal = staffItems.reduce((sum, s) =>
    sum + calcHours(s.start_time, s.end_time, s.break_hours ?? 0) * s.person_count * s.unit_price, 0);

  // Group schedule items by date for Gantt
  const schedByDate = scheduleItems.reduce((acc, s) => {
    acc[s.work_date] = acc[s.work_date] ?? [];
    acc[s.work_date].push(s);
    return acc;
  }, {} as Record<string, QuoteScheduleItem[]>);
  const scheduleDates = Object.keys(schedByDate).sort();

  const hasSchedule = scheduleItems.length > 0;
  const hasStaff = staffItems.length > 0;

  // Global time range for unified Gantt density across all dates
  const allScheduleMins = scheduleItems.flatMap(s => [toMin(s.start_time), toMin(s.end_time)]);
  const globalDayStart = allScheduleMins.length > 0 ? Math.min(...allScheduleMins) : 8 * 60;
  const globalDayEnd = allScheduleMins.length > 0 ? Math.max(...allScheduleMins) : 18 * 60;
  const globalSpan = Math.max(globalDayEnd - globalDayStart, 60);
  const globalHourLabels: number[] = [];
  for (let m = Math.floor(globalDayStart / 60) * 60; m <= globalDayEnd; m += 60) globalHourLabels.push(m);
  const deposit = quote.deposit ?? 0;
  const discount = quote.discount ?? 0;
  const balance = Math.max(0, quote.total - deposit);

  return (
    <div>
      {/* Action Bar */}
      <div className="no-print flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/admin/quotes/${quoteId}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800">報價單預覽</h1>
            <p className="text-sm font-mono text-gray-400">{quote.quote_number}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/quotes/${quoteId}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm rounded-xl transition-all">
            <Edit size={15} />編輯
          </Link>
          {quote.email && (
            <button onClick={handleSendEmail} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-xl transition-all disabled:opacity-60">
              <Send size={15} />{sending ? '發送中...' : '發送給客戶'}
            </button>
          )}
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
            <Printer size={15} />列印 / 儲存 PDF
          </button>
        </div>
      </div>

      {/* Quote Document */}
      <div ref={printRef} className="print-area bg-white rounded-2xl border border-gray-100 p-8 max-w-3xl mx-auto print:max-w-none print:border-none print:p-8 print:shadow-none">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 border-b-2 border-brand-500 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">步步</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">步步搬家</h2>
                <p className="text-xs text-gray-400">居家整聊股份有限公司</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">統編：55784792</p>
            <p className="text-xs text-gray-400">電話：02-77550920</p>
            <p className="text-xs text-gray-400">地址：台北市信義區信義路五段109號1樓</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold text-brand-600 mb-1">報 價 單</h1>
            <p className="text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">{quote.quote_number}</p>
            <p className="text-xs text-gray-400 mt-2">報價日期：{today}</p>
            <div className={`mt-2 text-xs font-medium px-3 py-1 rounded-full inline-block ${
              quote.status === '已確認' ? 'bg-green-100 text-green-700' :
              quote.status === '已發送' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-500'
            }`}>{quote.status}</div>
          </div>
        </div>

        {/* Client Info */}
        <div className={`grid gap-6 mb-8 bg-gray-50 rounded-xl p-5 ${quote.consultant_name ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">客戶資訊</p>
            <p className="font-semibold text-gray-800">{quote.customer_name}</p>
            {quote.company_name && <p className="text-sm text-gray-600">{quote.company_name}</p>}
            {quote.tax_id && <p className="text-sm text-gray-500">統編：{quote.tax_id}</p>}
            <p className="text-sm text-gray-600 mt-1">{quote.phone}</p>
            {quote.email && <p className="text-sm text-gray-500">{quote.email}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">搬遷資訊</p>
            {(['from', 'to'] as const).map(side => {
              const addr = side === 'from' ? quote.address_from : quote.address_to;
              const addrLabel = side === 'from' ? '搬遷地址' : '搬入地址';
              const type = side === 'from' ? quote.address_from_type : quote.address_to_type;
              const parking = side === 'from' ? quote.address_from_parking : quote.address_to_parking;
              const basement = side === 'from' ? quote.address_from_basement : quote.address_to_basement;
              const guard = side === 'from' ? quote.address_from_guard : quote.address_to_guard;
              if (!addr) return null;
              return (
                <div key={side} className={side === 'to' ? 'mt-3 pt-3 border-t border-gray-200' : ''}>
                  <p className="text-xs text-gray-400">{addrLabel}</p>
                  <p className="text-sm text-gray-700 font-medium mb-1">{addr}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    {type && <span className="text-xs text-gray-500">建築：{type}</span>}
                    {parking && <span className="text-xs text-gray-500">臨停區：{parking}</span>}
                    {basement && <span className="text-xs text-gray-500">地下室高度：{basement}</span>}
                    {guard && <span className="text-xs text-gray-500">管理室：{guard}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {quote.consultant_name && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">服務顧問</p>
              <p className="font-semibold text-gray-800">{quote.consultant_name}</p>
              {quote.consultant_phone && <p className="text-sm text-gray-600 mt-1">{quote.consultant_phone}</p>}
            </div>
          )}
        </div>

        {/* Items by Category */}
        {CATEGORIES.map(cat => {
          const cItems = catItems(cat);
          const showStaff = cat === '計時人員' && hasStaff;
          if (cItems.length === 0 && !showStaff) return null;
          const sectionTotal = catTotal(cat) + (cat === '計時人員' ? Math.round(staffTotal) : 0);
          return (
            <div key={cat} className="mb-6">
              <h3 className="font-semibold text-gray-800 bg-brand-50 text-brand-800 px-4 py-2 rounded-t-xl border border-brand-100 text-sm">{cat}</h3>

              {/* Product line items (non-計時人員) */}
              {cItems.length > 0 && (
                <table className="w-full text-sm border border-t-0 border-gray-100 overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">品項名稱</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">單價</th>
                      <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">數量</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cItems.map((item, i) => (
                      <tr key={item.id} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                        <td className="px-4 py-2.5 text-gray-700">{item.name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">NT${item.unit_price.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-800">NT${(item.unit_price * item.quantity).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Staff schedule items (計時人員) */}
              {showStaff && (
                <table className="w-full text-sm border border-t-0 border-gray-100 overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">品項</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">日期</th>
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">時段</th>
                      <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">人數</th>
                      <th className="text-center px-4 py-2 text-xs text-gray-500 font-medium">工時</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">時薪/人</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-medium">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffItems.map((s, i) => {
                      const bh = s.break_hours ?? 0;
                      const hours = calcHours(s.start_time, s.end_time, bh);
                      const sub = Math.round(hours * s.person_count * s.unit_price);
                      return (
                        <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                          <td className="px-4 py-2.5 text-gray-700 font-medium">{s.item_name ?? '整聊師'}</td>
                          <td className="px-4 py-2.5 text-gray-700">{s.work_date}</td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                            {bh > 0 && <span className="text-xs text-gray-400 ml-1">（休息 {bh}h）</span>}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{s.person_count} 人</td>
                          <td className="px-4 py-2.5 text-center text-gray-600">{hours.toFixed(1)} h</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">NT${s.unit_price.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">NT${sub.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={7} className="px-4 py-1 text-right text-xs text-gray-400">※ 休息時間不計費</td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Section subtotal */}
              <div className="border border-t-0 border-gray-100 rounded-b-xl bg-brand-50/50 px-4 py-2 flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">{cat}小計</span>
                <span className="font-bold text-brand-700">NT${sectionTotal.toLocaleString()}</span>
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div className="mt-4 space-y-3">
          <div className="bg-brand-500 text-white rounded-xl p-5">
            {discount > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-brand-400">
                <p className="text-brand-200 text-sm">原價</p>
                <p className="text-xl text-brand-300 line-through">NT${quote.subtotal.toLocaleString()}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm">{discount > 0 ? '折扣後金額（含稅）' : '合計金額（含稅）'}</p>
                {discount > 0 ? (
                  <p className="text-xs text-brand-200 mt-0.5">折扣 NT${discount.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-brand-200 mt-0.5">以上金額均為含稅報價</p>
                )}
              </div>
              <p className="text-3xl font-bold">NT${quote.total.toLocaleString()}</p>
            </div>
          </div>
          {deposit > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">定金</p>
                <p className="text-xl font-bold text-amber-700">NT${deposit.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600 mb-1">尾款</p>
                <p className="text-xl font-bold text-green-700">NT${balance.toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Payment Link + QR Code */}
          {quote.payment_link && (
            <div className="mt-6 bg-green-50 border border-green-100 rounded-xl p-5 print:break-inside-avoid">
              <h3 className="font-semibold text-green-800 mb-3 text-sm">線上付款</h3>
              <div className="flex items-start gap-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(quote.payment_link)}`}
                  alt="付款 QR Code"
                  className="w-[120px] h-[120px] rounded-lg border border-green-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-700 mb-2">掃描 QR Code 或點擊以下連結前往付款：</p>
                  <a
                    href={quote.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:text-green-800 underline break-all"
                  >
                    {quote.payment_link}
                  </a>
                  {quote.payment_status && (
                    <p className="mt-2 text-xs text-green-600">付款狀態：{quote.payment_status}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Schedule Table ── */}
        {hasSchedule && (
          <div className="mt-8">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm border-t border-gray-100 pt-6">作業排程表</h3>
            <table className="w-full text-sm border border-gray-100 rounded-xl overflow-hidden mb-6">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">日期</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">開始</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">結束</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">作業項目</th>
                  <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">分類</th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                    <td className="px-4 py-2.5 text-gray-700">{s.work_date}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtTime(s.start_time)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtTime(s.end_time)}</td>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{s.label}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: CAT_COLORS[s.category] ?? '#6B7280' }}>
                        {s.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── CSS Gantt Chart (packed rows) ── */}
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">時程甘特圖</h3>
            <div className="space-y-4">
              {/* Shared hour axis */}
              <div className="relative mb-1" style={{ height: '16px' }}>
                {globalHourLabels.map(m => {
                  const pct = ((m - globalDayStart) / globalSpan) * 100;
                  if (pct < 0 || pct > 100) return null;
                  return (
                    <span key={m} className="absolute text-xs text-gray-400 -translate-x-1/2"
                      style={{ left: `${pct}%` }}>
                      {String(Math.floor(m / 60)).padStart(2, '0')}:{String(m % 60).padStart(2, '0')}
                    </span>
                  );
                })}
              </div>
              {scheduleDates.map(date => {
                const dayItems = schedByDate[date];
                const packedRows = packIntoRows(dayItems);
                const totalHeight = packedRows.length * 32 + 8;

                return (
                  <div key={date}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">{date}</p>
                    {/* Gantt rows (packed), using global time scale */}
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden"
                      style={{ height: `${totalHeight}px` }}>
                      {packedRows.map((row, rowIdx) =>
                        row.map(s => {
                          const left = ((toMin(s.start_time) - globalDayStart) / globalSpan) * 100;
                          const width = Math.max(((toMin(s.end_time) - toMin(s.start_time)) / globalSpan) * 100, 2);
                          const color = CAT_COLORS[s.category] ?? '#6B7280';
                          return (
                            <div key={s.id}
                              className="absolute flex items-center px-2 rounded text-white text-xs font-medium overflow-hidden whitespace-nowrap"
                              style={{
                                left: `${left}%`, width: `${width}%`,
                                top: `${rowIdx * 32 + 4}px`, height: '26px',
                                backgroundColor: color,
                              }}
                              title={`${fmtTime(s.start_time)} – ${fmtTime(s.end_time)} ${s.label}`}>
                              {s.label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(CAT_COLORS).map(([cat, color]) => (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  {cat}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 備註區 ── */}
        {remarkNotes.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">備註</h3>
            <ul className="space-y-1.5">
              {remarkNotes.map((note, i) => (
                <li key={i} className="flex gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0">•</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {checkedNotes.length > 0 && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">注意事項</h3>
            <ol className="space-y-2">
              {checkedNotes.map((note, i) => (
                <li key={note.id} className="flex gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0 font-medium text-gray-400">{i + 1}.</span>
                  <span>{note.content}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Signatures & Stamp */}
        <div className="mt-10 pt-6 border-t border-gray-200 grid grid-cols-2 gap-10">
          <div>
            <p className="text-xs text-gray-500 mb-1">客戶簽認</p>
            <p className="text-xs text-gray-400 mb-8">本人已詳閱報價內容及注意事項，同意以上條件。付款視同同意合約內容。</p>
            <div className="border-b border-gray-400 w-full" />
            <p className="text-xs text-gray-400 mt-1 text-center">簽名 ／ 日期</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">步步搬家 公司用印</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl h-20 flex items-center justify-center text-xs text-gray-300 mt-2">
              公 司 章
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">感謝您選擇步步搬家，如有任何疑問請聯繫您的服務顧問或撥打：02-77550920</p>
        </div>
      </div>
    </div>
  );
}
