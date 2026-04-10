import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Edit, Search } from 'lucide-react';
import { supabase, Quote, Consultant, T } from '../../lib/supabase';

const statusColor: Record<string, string> = {
  '草稿':  'bg-gray-100 text-gray-500',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

interface QuoteWithConsultant extends Quote {
  consultant?: { display_name: string } | null;
}

export default function AdminQuoteList() {
  const [quotes, setQuotes] = useState<QuoteWithConsultant[]>([]);
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [search, setSearch] = useState('');
  const [filterConsultant, setFilterConsultant] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from(T.quotes)
        .select(`*, consultant:${T.consultants}(display_name)`)
        .order('created_at', { ascending: false }),
      supabase.from(T.consultants).select('*').eq('is_active', true).order('display_name'),
    ]).then(([qRes, cRes]) => {
      setQuotes((qRes.data as QuoteWithConsultant[]) ?? []);
      setConsultants((cRes.data as Consultant[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.customer_name.includes(search) ||
      q.quote_number.includes(search) ||
      q.phone.includes(search);
    const matchConsultant = !filterConsultant || q.consultant_id === filterConsultant;
    return matchSearch && matchConsultant;
  });

  const updateStatus = async (id: string, status: string) => {
    await supabase.from(T.quotes).update({ status }).eq('id', id);
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: status as Quote['status'] } : q));
  };

  const getConsultantName = (q: QuoteWithConsultant) =>
    q.consultant?.display_name ?? q.consultant_name ?? '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">報價單管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {filtered.length} 份報價單</p>
        </div>
        <Link to="/admin/quotes/new"
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm rounded-xl transition-all">
          <Plus size={15} />新增報價單
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="搜尋客戶姓名、電話、單號..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        {consultants.length > 0 && (
          <select value={filterConsultant} onChange={e => setFilterConsultant(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 min-w-[140px]">
            <option value="">所有顧問</option>
            {consultants.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 mb-4">尚無報價單</p>
            <Link to="/admin/quotes/new" className="text-brand-600 hover:underline text-sm">建立第一份報價單</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['單號', '客戶', '聯絡方式', '負責顧問', '金額', '狀態', '建立日期', '操作'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{q.quote_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{q.customer_name}</p>
                      {q.company_name && <p className="text-xs text-gray-400">{q.company_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{q.phone}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{getConsultantName(q)}</td>
                    <td className="px-4 py-3 font-semibold text-brand-600">NT${q.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select value={q.status} onChange={e => updateStatus(q.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-brand-400 ${statusColor[q.status]}`}>
                        {['草稿', '已發送', '已確認', '已取消'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(q.created_at).toLocaleDateString('zh-TW')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/quotes/${q.id}/view`}
                          className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-600 hover:bg-brand-100 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Eye size={13} />預覽
                        </Link>
                        <Link to={`/admin/quotes/${q.id}`}
                          className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition-colors">
                          <Edit size={13} />編輯
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
