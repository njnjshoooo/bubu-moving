import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { supabase, Order, T } from '../../lib/supabase';

const STATUSES = ['待處理', '處理中', '已完成', '已取消'];
const STATUS_COLOR: Record<string, string> = {
  '待處理': 'bg-yellow-100 text-yellow-700',
  '處理中': 'bg-blue-100 text-blue-700',
  '已完成': 'bg-green-100 text-green-700',
  '已取消': 'bg-gray-100 text-gray-400',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('全部');

  const fetchOrders = async () => {
    const { data } = await supabase.from(T.orders)
      .select('*').order('created_at', { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from(T.orders).update({ status }).eq('id', id);
    fetchOrders();
  };

  const filtered = filter === '全部' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">訂購單管理</h1>
        <div className="flex gap-1">
          {['全部', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <ShoppingBag size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">目前沒有訂購單</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="font-semibold text-gray-800">{order.customer_name || '未填姓名'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.phone && <span className="mr-3">{order.phone}</span>}
                    {order.email && <span>{order.email}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(order.created_at).toLocaleString('zh-TW')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={order.status} onChange={e => updateStatus(order.id, e.target.value)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 focus:outline-none cursor-pointer ${STATUS_COLOR[order.status] ?? 'bg-gray-100'}`}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                {(order.items ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="text-gray-500">x{item.qty} = NT${((item.price ?? 0) * (item.qty ?? 1)).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-sm font-semibold">
                  <span>合計</span>
                  <span className="text-brand-600">NT${(order.total ?? 0).toLocaleString()}</span>
                </div>
              </div>
              {order.notes && <p className="text-xs text-gray-500 mt-2">備註：{order.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
