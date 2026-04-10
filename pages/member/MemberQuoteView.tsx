import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Phone, User } from 'lucide-react';
import { supabase, Quote, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const statusColor: Record<string, string> = {
  '草稿':  'bg-gray-100 text-gray-600',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

export default function MemberQuoteView() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!quoteId || !user) return;
    supabase.from(T.quotes)
      .select(`*,
        quote_items:${T.quoteItems}(*),
        staff_schedule_items:${T.staffSchedule}(*),
        quote_schedule_items:${T.quoteSchedule}(*)
      `)
      .eq('id', quoteId)
      .or(`customer_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setQuote(data as Quote);
        else setNotFound(true);
        setLoading(false);
      });
  }, [quoteId, user]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
    </div>
  );

  if (notFound || !quote) return (
    <div className="text-center py-16">
      <p className="text-gray-400 mb-4">找不到此報價單</p>
      <Link to="/member/quotes" className="text-brand-600 hover:underline text-sm">← 返回報價單列表</Link>
    </div>
  );

  const balance = quote.total - (quote.deposit ?? 0);
  const lineItems = quote.quote_items ?? [];
  const staffItems = quote.staff_schedule_items ?? [];
  const CATS = ['搬家車趟費', '打包計時人員', '包材費'] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/member/quotes" className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">報價單 {quote.quote_number}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[quote.status]}`}>
              {quote.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">建立日期：{new Date(quote.created_at).toLocaleDateString('zh-TW')}</p>
        </div>
        {quote.payment_link && (
          <a href={quote.payment_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl transition-colors">
            <ExternalLink size={15} />前往付款
          </a>
        )}
      </div>

      {/* 案件進度 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">案件進度</h2>
        <div className="flex items-center gap-1">
          {[
            { label: '報價建立', active: true },
            { label: '已發送報價', active: quote.status !== '草稿' && quote.status !== '已取消' },
            { label: '客戶確認', active: quote.status === '已確認' },
            { label: '搬家完成', active: false },
          ].map((step, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  step.active ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-200'
                }`} />
                <span className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">{step.label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mb-3.5 ${step.active ? 'bg-brand-300' : 'bg-gray-100'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 費用摘要 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-700 mb-4">費用摘要</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-brand-50 rounded-xl p-4 text-center">
            <p className="text-xs text-brand-600 mb-1">報價總額</p>
            <p className="text-2xl font-bold text-brand-700">NT${quote.total.toLocaleString()}</p>
          </div>
          {(quote.deposit ?? 0) > 0 && (
            <>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">定金</p>
                <p className="text-2xl font-bold text-amber-700">NT${quote.deposit.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">尾款</p>
                <p className="text-2xl font-bold text-gray-700">NT${balance.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>
        {quote.payment_status && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">付款狀態：</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              quote.payment_status === '已付款' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>{quote.payment_status}</span>
          </div>
        )}
      </div>

      {/* 費用明細 */}
      {CATS.map(cat => {
        const items = lineItems.filter(i => i.category === cat);
        if (items.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">{cat}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-gray-400 text-xs">×{item.quantity}</span>
                    <span className="font-medium text-gray-800">
                      NT${(item.unit_price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {cat === '打包計時人員' && staffItems.length > 0 && (
              <div className="px-5 pb-3">
                <p className="text-xs font-medium text-gray-500 mb-2 mt-2">人員工時安排</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left py-1">日期</th>
                        <th className="text-left py-1">時段</th>
                        <th className="text-left py-1">人數</th>
                        <th className="text-right py-1">小計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffItems.map(s => {
                        const [sh, sm] = s.start_time.split(':').map(Number);
                        const [eh, em] = s.end_time.split(':').map(Number);
                        const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
                        const sub = Math.round(hours * s.person_count * s.unit_price);
                        return (
                          <tr key={s.id} className="border-t border-gray-50 text-gray-600">
                            <td className="py-1.5">{s.work_date}</td>
                            <td className="py-1.5">{s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}</td>
                            <td className="py-1.5">{s.person_count} 人</td>
                            <td className="py-1.5 text-right font-medium">NT${sub.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 顧問聯絡 */}
      {(quote.consultant_name || quote.consultant_phone) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-3">負責顧問</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-brand-600" />
            </div>
            <div>
              {quote.consultant_name && <p className="font-medium text-gray-800">{quote.consultant_name}</p>}
              {quote.consultant_phone && (
                <a href={`tel:${quote.consultant_phone}`}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
                  <Phone size={13} />{quote.consultant_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 付款資訊 */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-700">
        <p className="font-semibold mb-1">匯款資訊</p>
        <p>銀行：台灣銀行（004）</p>
        <p>帳號：123-456-789012</p>
        <p>戶名：步步搬家有限公司</p>
        <p className="mt-2 text-xs text-blue-500">匯款後請保留收據，並告知負責顧問。</p>
      </div>
    </div>
  );
}
