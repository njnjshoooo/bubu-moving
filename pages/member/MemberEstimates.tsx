import React, { useEffect, useState } from 'react';
import { Calculator, Trash2, Truck, Users, Clock, Package } from 'lucide-react';
import { supabase, Estimate, T } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const SERVICE_LABELS: Record<string, string> = {
  self: '自助搬家',
  full: '一條龍搬家',
  enterprise: '企業搬遷',
};

export default function MemberEstimates() {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEstimates = async () => {
    if (!user) return;
    const { data } = await supabase.from(T.estimates)
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setEstimates((data ?? []) as Estimate[]);
    setLoading(false);
  };

  useEffect(() => { fetchEstimates(); }, [user]);

  const deleteEstimate = async (id: string) => {
    await supabase.from(T.estimates).delete().eq('id', id);
    setEstimates(prev => prev.filter(e => e.id !== id));
  };

  if (loading) return <div className="text-center py-12 text-gray-400">載入中...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">我的試算</h1>
        <p className="text-sm text-gray-500 mt-1">共 {estimates.length} 筆試算紀錄</p>
      </div>

      {estimates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Calculator size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">尚無試算紀錄</p>
          <a href="/#estimate" className="mt-3 inline-block text-sm text-brand-600 hover:underline">前往費用試算</a>
        </div>
      ) : (
        <div className="space-y-4">
          {estimates.map(est => (
            <div key={est.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block text-xs font-medium bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">
                    {SERVICE_LABELS[est.service_type ?? ''] ?? est.service_type}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(est.created_at).toLocaleString('zh-TW')}</p>
                </div>
                <button onClick={() => deleteEstimate(est.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Truck size={16} className="mx-auto text-brand-500 mb-1" />
                  <p className="text-lg font-bold text-gray-800">{est.estimated_trucks}</p>
                  <p className="text-xs text-gray-500">車數</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Users size={16} className="mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-gray-800">{est.estimated_people}</p>
                  <p className="text-xs text-gray-500">人數</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Clock size={16} className="mx-auto text-purple-500 mb-1" />
                  <p className="text-lg font-bold text-gray-800">{est.estimated_hours}</p>
                  <p className="text-xs text-gray-500">預估小時</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <Package size={16} className="mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-gray-800">{est.area}</p>
                  <p className="text-xs text-gray-500">坪數</p>
                </div>
              </div>
              <div className="bg-brand-50 rounded-xl p-3 flex items-center justify-between">
                <div className="space-y-0.5 text-xs text-gray-600">
                  <p>車資 NT${(est.truck_cost ?? 0).toLocaleString()}</p>
                  <p>人工 NT${(est.labor_cost ?? 0).toLocaleString()}</p>
                  <p>包材 NT${(est.supply_cost ?? 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-600">預估總價</p>
                  <p className="text-2xl font-bold text-brand-600">NT${(est.estimated_total ?? 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
