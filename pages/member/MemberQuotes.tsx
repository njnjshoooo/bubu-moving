import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase, Quote, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const statusColor: Record<string, string> = {
  '草稿':  'bg-gray-100 text-gray-500',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

export default function MemberQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // 查詢 customer_user_id 匹配，或 email 匹配（相容舊報價單）
    supabase.from(T.quotes)
      .select('*')
      .or(`customer_user_id.eq.${user.id},email.eq.${user.email}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setQuotes((data as Quote[]) ?? []); setLoading(false); });
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
    </div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">我的報價單</h1>
        <p className="text-sm text-gray-500 mt-1">共 {quotes.length} 份報價單</p>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">尚無報價單記錄</p>
          <p className="text-gray-400 text-xs mt-1">完成估價預約後，顧問將為您建立報價單</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => {
            const balance = q.total - (q.deposit ?? 0);
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">{q.quote_number}</span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColor[q.status]}`}>
                        {q.status}
                      </span>
                      {q.payment_status && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.payment_status === '已付款' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {q.payment_status}
                        </span>
                      )}
                    </div>

                    {/* 金額資訊 */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-xs text-gray-400">報價總額</p>
                        <p className="text-lg font-bold text-brand-600">NT${q.total.toLocaleString()}</p>
                      </div>
                      {(q.deposit ?? 0) > 0 && (
                        <>
                          <div className="text-gray-200">|</div>
                          <div>
                            <p className="text-xs text-gray-400">定金</p>
                            <p className="font-semibold text-amber-600">NT${q.deposit.toLocaleString()}</p>
                          </div>
                          <div className="text-gray-200">|</div>
                          <div>
                            <p className="text-xs text-gray-400">尾款</p>
                            <p className="font-semibold text-gray-700">NT${balance.toLocaleString()}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 顧問資訊 */}
                    {(q.consultant_name || q.consultant_phone) && (
                      <p className="text-xs text-gray-400 mt-2">
                        顧問：{q.consultant_name}{q.consultant_phone ? ` · ${q.consultant_phone}` : ''}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      建立日期：{new Date(q.created_at).toLocaleDateString('zh-TW')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Link to={`/member/quotes/${q.id}`}
                      className="flex items-center gap-1.5 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-2 rounded-xl transition-colors">
                      <FileText size={13} />查看報價單
                      <ChevronRight size={13} />
                    </Link>
                    {q.payment_link && (
                      <a href={q.payment_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-xl transition-colors">
                        <ExternalLink size={13} />前往付款
                      </a>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-2">案件進度</p>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '報價建立', active: true },
                      { label: '報價確認', active: q.status === '已確認' || q.status === '已發送' },
                      { label: '款項確認', active: q.status === '已確認' },
                      { label: '搬家完成', active: false },
                    ].map((step, i) => (
                      <React.Fragment key={i}>
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${
                            step.active ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-200'
                          }`} />
                          <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{step.label}</span>
                        </div>
                        {i < 3 && (
                          <div className={`flex-1 h-0.5 mb-3 ${step.active ? 'bg-brand-200' : 'bg-gray-100'}`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
