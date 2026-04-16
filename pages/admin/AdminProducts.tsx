import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Edit3, X, Star } from 'lucide-react';
import { supabase, Product, T } from '../../lib/supabase';

const CATEGORIES = ['紙箱', '防護', '膠帶', '其他'];

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', category: '紙箱', price: 0, description: '', specs: '',
    usage_tip: '', image_url: '', is_popular: false, sort_order: 0,
  });

  const fetchProducts = async () => {
    const { data } = await supabase.from(T.products)
      .select('*').order('sort_order').order('created_at');
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setForm({ name: '', category: '紙箱', price: 0, description: '', specs: '', usage_tip: '', image_url: '', is_popular: false, sort_order: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category, price: p.price,
      description: p.description ?? '', specs: p.specs ?? '',
      usage_tip: p.usage_tip ?? '', image_url: p.image_url ?? '',
      is_popular: p.is_popular, sort_order: p.sort_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await supabase.from(T.products).update(form).eq('id', editing.id);
    } else {
      await supabase.from(T.products).insert({ ...form, is_active: true });
    }
    resetForm();
    fetchProducts();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from(T.products).update({ is_active: !current }).eq('id', id);
    fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    await supabase.from(T.products).delete().eq('id', id);
    fetchProducts();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">商品管理</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} />新增商品
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">{editing ? '編輯商品' : '新增商品'}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">商品名稱 *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">分類</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">售價 (NT$)</label>
                  <input type="number" min={0} value={form.price}
                    onChange={e => setForm({ ...form, price: +e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">商品說明</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">規格</label>
                <input value={form.specs} onChange={e => setForm({ ...form, specs: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">使用建議</label>
                <input value={form.usage_tip} onChange={e => setForm({ ...form, usage_tip: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">圖片網址</label>
                <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">排序</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_popular} onChange={e => setForm({ ...form, is_popular: e.target.checked })}
                      className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">熱銷推薦</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={resetForm} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">取消</button>
              <button onClick={handleSave} className="flex-1 py-2 bg-brand-500 text-white rounded-xl text-sm hover:bg-brand-600">
                {editing ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 font-medium">
                <th className="text-left px-4 py-3">商品</th>
                <th className="text-left px-4 py-3">分類</th>
                <th className="text-right px-4 py-3">售價</th>
                <th className="text-center px-4 py-3">狀態</th>
                <th className="text-center px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className={`border-t border-gray-50 hover:bg-gray-50 ${!p.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                      <div>
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.is_popular && <span className="text-xs text-amber-600 flex items-center gap-0.5"><Star size={10} />熱銷</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3 text-right font-medium">NT${p.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {p.is_active ? '上架中' : '已下架'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="編輯"><Edit3 size={14} /></button>
                      <button onClick={() => toggleActive(p.id, p.is_active)} className="p-1.5 hover:bg-gray-100 rounded-lg" title={p.is_active ? '下架' : '上架'}>
                        {p.is_active ? <EyeOff size={14} className="text-gray-400" /> : <Eye size={14} className="text-green-500" />}
                      </button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="刪除"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && <p className="text-sm text-gray-400 text-center py-8">尚無商品，點右上角新增</p>}
      </div>
    </div>
  );
}
