import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft, Edit } from 'lucide-react';
import { supabase, Quote, NoteTemplate, T } from '../../lib/supabase';

const CATEGORIES = ['搬家車趟費', '打包計時人員', '包材費'];

export default function QuoteView() {
  const { quoteId } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkedNotes, setCheckedNotes] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
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
      }
      setLoading(false);
    };
    load();
  }, [quoteId]);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent" />
    </div>
  );
  if (!quote) return <div className="p-8 text-center text-gray-400">找不到此報價單</div>;

  const today = new Date().toLocaleDateString('zh-TW');
  const catItems = (cat: string) => (quote.quote_items ?? []).filter(i => i.category === cat);
  const catTotal = (cat: string) => catItems(cat).reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <div>
      {/* Action Bar - hidden when printing */}
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
        <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 rounded-xl p-5">
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
            {quote.address_from && (
              <div className="mb-2">
                <p className="text-xs text-gray-400">搬出地址</p>
                <p className="text-sm text-gray-700">{quote.address_from}</p>
              </div>
            )}
            {quote.address_to && (
              <div>
                <p className="text-xs text-gray-400">搬入地址</p>
                <p className="text-sm text-gray-700">{quote.address_to}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items by Category */}
        {CATEGORIES.map(cat => {
          const cItems = catItems(cat);
          if (cItems.length === 0) return null;
          return (
            <div key={cat} className="mb-6">
              <h3 className="font-semibold text-gray-800 bg-brand-50 text-brand-800 px-4 py-2 rounded-t-xl border border-brand-100 text-sm">
                {cat}
              </h3>
              <table className="w-full text-sm border border-t-0 border-gray-100 rounded-b-xl overflow-hidden">
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
                  <tr className="bg-brand-50/50">
                    <td colSpan={3} className="px-4 py-2 text-right text-sm text-gray-500 font-medium">{cat}小計</td>
                    <td className="px-4 py-2 text-right font-bold text-brand-700">NT${catTotal(cat).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Total */}
        <div className="mt-4 bg-brand-500 text-white rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-brand-100 text-sm">合計金額（含稅）</p>
            <p className="text-xs text-brand-200 mt-0.5">以上金額均為含稅報價</p>
          </div>
          <p className="text-3xl font-bold">NT${quote.total.toLocaleString()}</p>
        </div>

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

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">感謝您選擇步步搬家，如有任何疑問請聯繫我們：02-77550920</p>
        </div>
      </div>
    </div>
  );
}
