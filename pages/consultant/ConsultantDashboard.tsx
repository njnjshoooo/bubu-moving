import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, FileText, DollarSign, ClipboardList, Target } from 'lucide-react';
import { supabase, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface KPI {
  estimateCount: number;
  quoteCount: number;
  totalRevenue: number;
  monthRevenue: number;
  monthTarget: number;
}

const statusColor: Record<string, string> = {
  '草稿':  'bg-gray-100 text-gray-500',
  '已發送': 'bg-blue-100 text-blue-700',
  '已確認': 'bg-green-100 text-green-700',
  '已取消': 'bg-red-100 text-red-600',
};

export default function ConsultantDashboard() {
  const { user, profile } = useAuth();
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [consultantId, setConsultantId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // 1. 取得顧問 ID
      const { data: cData } = await supabase
        .from(T.consultants)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const cId = cData?.id ?? null;
      setConsultantId(cId);

      if (!cId) { setLoading(false); return; }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const [estRes, quoteRes, revRes, monthRevRes, goalRes, recentRes] = await Promise.all([
        // 累計估價數（指派的預約）
        supabase.from(T.bookings).select('id', { count: 'exact', head: true }).eq('assigned_consultant_id', cId),
        // 累計報價數（已發送/已確認）
        supabase.from(T.quotes).select('id', { count: 'exact', head: true })
          .eq('consultant_id', cId).in('status', ['已發送', '已確認']),
        // 累計實收金額（已確認的總額）
        supabase.from(T.quotes).select('total').eq('consultant_id', cId).eq('status', '已確認'),
        // 本月實收
        supabase.from(T.quotes).select('total').eq('consultant_id', cId).eq('status', '已確認')
          .gte('created_at', monthStart).lt('created_at', nextMonth),
        // 本月目標
        supabase.from(T.goals).select('monthly_target').eq('consultant_id', cId)
          .eq('year', year).eq('month', month).maybeSingle(),
        // 最近報價單
        supabase.from(T.quotes).select('id, quote_number, customer_name, total, status, created_at')
          .eq('consultant_id', cId).order('created_at', { ascending: false }).limit(5),
      ]);

      const totalRevenue = (revRes.data ?? []).reduce((s: number, r: any) => s + r.total, 0);
      const monthRevenue = (monthRevRes.data ?? []).reduce((s: number, r: any) => s + r.total, 0);

      setKpi({
        estimateCount: estRes.count ?? 0,
        quoteCount: quoteRes.count ?? 0,
        totalRevenue,
        monthRevenue,
        monthTarget: goalRes.data?.monthly_target ?? 0,
      });
      setRecentQuotes(recentRes.data ?? []);
      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent" />
    </div>
  );

  const achievementRate = kpi && kpi.monthTarget > 0
    ? Math.min(Math.round((kpi.monthRevenue / kpi.monthTarget) * 100), 100)
    : null;

  const now = new Date();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">業績儀表板</h1>
        <p className="text-sm text-gray-500 mt-1">
          您好，{profile?.display_name ?? '顧問'} · {now.getFullYear()} 年 {now.getMonth() + 1} 月
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">累計估價數</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{kpi?.estimateCount ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">次到府估價</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">累計報價數</span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{kpi?.quoteCount ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">份報價單</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-green-600" />
            </div>
            <span className="text-xs text-gray-500">累計實收金額</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            NT${(kpi?.totalRevenue ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">已確認訂單</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Target size={18} className="text-amber-600" />
            </div>
            <span className="text-xs text-gray-500">本月目標達成率</span>
          </div>
          {achievementRate !== null ? (
            <>
              <p className="text-3xl font-bold text-gray-800">{achievementRate}%</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    achievementRate >= 100 ? 'bg-green-500' :
                    achievementRate >= 60 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${achievementRate}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                NT${(kpi?.monthRevenue ?? 0).toLocaleString()} / NT${(kpi?.monthTarget ?? 0).toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300">—</p>
              <p className="text-xs text-gray-400 mt-1">尚未設定月目標</p>
            </>
          )}
        </div>
      </div>

      {/* 本月實收 highlight */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <TrendingUp size={22} />
          <div>
            <p className="text-sm text-green-100">本月實收金額</p>
            <p className="text-3xl font-bold">NT${(kpi?.monthRevenue ?? 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 最近報價單 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">最近報價單</h2>
        </div>
        {recentQuotes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">尚無報價單</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentQuotes.map(q => (
              <div key={q.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{q.customer_name}</p>
                  <p className="text-xs text-gray-400 font-mono">{q.quote_number}</p>
                  <p className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString('zh-TW')}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-brand-600 text-sm">NT${q.total.toLocaleString()}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[q.status]}`}>
                    {q.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
