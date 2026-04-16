import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, Edit3, X } from 'lucide-react';
import { supabase, CaseStudy, T } from '../../lib/supabase';

const CATEGORIES = ['家庭搬家', '企業搬遷', '長途/回頭車', '特殊物件', '加值服務', '倉儲服務'];

export default function AdminCaseStudies() {
  const [cases, setCases] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CaseStudy | null>(null);
  const [form, setForm] = useState({
    title: '', category: '家庭搬家', location: '', work_date: '',
    image_url: '', description: '', testimonial: '', author: '', sort_order: 0,
  });

  const fetchCases = async () => {
    const { data } = await supabase.from(T.caseStudies)
      .select('*').order('sort_order').order('created_at', { ascending: false });
    setCases((data ?? []) as CaseStudy[]);
    setLoading(false);
  };

  useEffect(() => { fetchCases(); }, []);

  const resetForm = () => {
    setForm({ title: '', category: '家庭搬家', location: '', work_date: '', image_url: '', description: '', testimonial: '', author: '', sort_order: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (c: CaseStudy) => {
    setEditing(c);
    setForm({
      title: c.title, category: c.category, location: c.location ?? '',
      work_date: c.work_date ?? '', image_url: c.image_url ?? '',
      description: c.description ?? '', testimonial: c.testimonial ?? '',
      author: c.author ?? '', sort_order: c.sort_order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editing) {
      await supabase.from(T.caseStudies).update(form).eq('id', editing.id);
    } else {
      await supabase.from(T.caseStudies).insert({ ...form, is_visible: true });
    }
    resetForm();
    fetchCases();
  };

  const toggleVisible = async (id: string, current: boolean) => {
    await supabase.from(T.caseStudies).update({ is_visible: !current }).eq('id', id);
    fetchCases();
  };

  const deleteCase = async (id: string) => {
    await supabase.from(T.caseStudies).delete().eq('id', id);
    fetchCases();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">案例管理</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-2 rounded-xl transition-colors">
          <Plus size={16} />新增案例
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-800">{editing ? '編輯案例' : '新增案例'}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">標題 *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
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
                  <label className="text-xs text-gray-500 mb-1 block">地點</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="台北市信義區"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">日期</label>
                  <input value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })}
                    placeholder="2024年3月"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">排序</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: +e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">圖片網址</label>
                <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">案例描述</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">客戶推薦語</label>
                <textarea value={form.testimonial} onChange={e => setForm({ ...form, testimonial: e.target.value })} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">推薦者名稱</label>
                <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })}
                  placeholder="王先生"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
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

      {/* Case List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map(c => (
          <div key={c.id} className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${!c.is_visible ? 'opacity-50' : ''}`}>
            {c.image_url && <img src={c.image_url} alt={c.title} className="w-full h-40 object-cover" />}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{c.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{c.category} · {c.location}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.is_visible ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {c.is_visible ? '顯示中' : '已隱藏'}
                </span>
              </div>
              {c.description && <p className="text-sm text-gray-600 line-clamp-2 mb-3">{c.description}</p>}
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="編輯"><Edit3 size={14} /></button>
                <button onClick={() => toggleVisible(c.id, c.is_visible)} className="p-1.5 hover:bg-gray-100 rounded-lg" title={c.is_visible ? '隱藏' : '顯示'}>
                  {c.is_visible ? <EyeOff size={14} className="text-gray-400" /> : <Eye size={14} className="text-green-500" />}
                </button>
                <button onClick={() => deleteCase(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="刪除"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {cases.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">尚無案例，點右上角新增</p>
        </div>
      )}
    </div>
  );
}
