import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, T, Quote } from '../../lib/supabase';
import { FileSpreadsheet, ChevronRight, Calendar, User } from 'lucide-react';
import { useBasePath } from '../../lib/useBasePath';

export default function TestQuoteList() {
  const navigate = useNavigate();
  const base = useBasePath();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from(T.quotes)
      .select('id,quote_number,customer_name,phone,created_at,total,status,address_from,address_to')
      .order('created_at', { ascending: false })
      .limit(100);
    setQuotes((data ?? []) as Quote[]);
    setLoading(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet size={24} className="text-brand-500" />
          測試報價單
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          整合報價單、計劃書與錄音資訊的統一視圖（測試中）
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">載入中…</div>
        ) : quotes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">目前沒有報價單</div>
        ) : (
          <div className="divide-y">
            {quotes.map(q => (
              <button
                key={q.id}
                onClick={() => navigate(`${base}/test-quotes/${q.id}`)}
                className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-gray-500">{q.quote_number}</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{q.status}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-gray-900 inline-flex items-center gap-1">
                      <User size={14} className="text-gray-400" />
                      {q.customer_name}
                    </span>
                    <span className="text-gray-500 inline-flex items-center gap-1">
                      <Calendar size={14} />
                      {q.created_at?.slice(0, 10)}
                    </span>
                    <span className="text-brand-600 font-semibold">
                      ${q.total?.toLocaleString()}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
