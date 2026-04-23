import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Plus, Trash2, Printer,
  ChevronDown, ChevronUp, CheckSquare, Square,
} from 'lucide-react';
import {
  supabase, T, MovingPlan, MovingPlanEstimation, MovingPlanExecution, MovingPlanReview,
} from '../../lib/supabase';
import { useBasePath } from '../../lib/useBasePath';

// ── Collapsible Section ──────────────────────────────────────────────────────
const Section: React.FC<{
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, badge, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-gray-800">{title}</h3>
          {badge && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{badge}</span>}
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">{children}</div>}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <div>
    <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400';

// Checkbox 元件
const CB: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600">
    {checked ? <CheckSquare size={16} className="text-brand-600" /> : <Square size={16} className="text-gray-400" />}
    {label}
  </button>
);

// ── Main Component ──────────────────────────────────────────────────────────
export default function MovingPlanBuilder() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const [plan, setPlan] = useState<MovingPlan | null>(null);
  const [est, setEst] = useState<MovingPlanEstimation>({ supplies: {} });
  const [exec, setExec] = useState<MovingPlanExecution>({});
  const [review, setReview] = useState<MovingPlanReview>({});
  const [quoteCustomer, setQuoteCustomer] = useState<{ name: string; phone: string; address_from: string; address_to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const upd = <K extends keyof MovingPlanEstimation>(key: K, value: MovingPlanEstimation[K]) =>
    setEst(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!quoteId) return;
    (async () => {
      // 載入報價單資訊（帶客戶資料）
      const { data: quote } = await supabase.from(T.quotes)
        .select('customer_name, phone, address_from, address_to, consultant_id')
        .eq('id', quoteId).maybeSingle();
      if (quote) {
        setQuoteCustomer({
          name: quote.customer_name ?? '',
          phone: quote.phone ?? '',
          address_from: quote.address_from ?? '',
          address_to: quote.address_to ?? '',
        });
      }

      // 載入或建立計劃書
      const { data: existing } = await supabase.from(T.movingPlans)
        .select('*').eq('quote_id', quoteId).maybeSingle();
      if (existing) {
        setPlan(existing as MovingPlan);
        setEst({ ...((existing as MovingPlan).estimation ?? {}), supplies: (existing as MovingPlan).estimation?.supplies ?? {} });
        setExec((existing as MovingPlan).execution ?? {});
        setReview((existing as MovingPlan).review ?? {});
      }
      setLoading(false);
    })();
  }, [quoteId]);

  const save = async () => {
    if (!quoteId) return;
    setSaving(true);
    try {
      const payload = {
        quote_id: quoteId,
        estimation: est,
        execution: exec,
        review: review,
        status: plan?.status ?? 'draft',
      };
      const { data, error } = plan
        ? await supabase.from(T.movingPlans).update(payload).eq('id', plan.id).select().single()
        : await supabase.from(T.movingPlans).insert(payload).select().single();
      if (error) throw error;
      setPlan(data as MovingPlan);
      alert('已儲存');
    } catch (err: any) {
      alert(`儲存失敗：${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── 大型家具 / 家電 / 物品異動 helpers ──
  const addFurniture = () => upd('large_furniture', [...(est.large_furniture ?? []), { name: '', qty: 1, need_disassembly: false }]);
  const updFurniture = (i: number, patch: Partial<{ name: string; qty: number; need_disassembly: boolean }>) =>
    upd('large_furniture', (est.large_furniture ?? []).map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const delFurniture = (i: number) => upd('large_furniture', (est.large_furniture ?? []).filter((_, idx) => idx !== i));

  const addAppliance = () => upd('large_appliances', [...(est.large_appliances ?? []), { name: '', qty: 1 }]);
  const updAppliance = (i: number, patch: Partial<{ name: string; qty: number; note?: string }>) =>
    upd('large_appliances', (est.large_appliances ?? []).map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const delAppliance = (i: number) => upd('large_appliances', (est.large_appliances ?? []).filter((_, idx) => idx !== i));

  const addMovement = () => upd('item_movements', [...(est.item_movements ?? []), { from: '', name: '', to: '' }]);
  const updMovement = (i: number, patch: Partial<{ from: string; name: string; to: string }>) =>
    upd('item_movements', (est.item_movements ?? []).map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const delMovement = (i: number) => upd('item_movements', (est.item_movements ?? []).filter((_, idx) => idx !== i));

  // 耗材估算金額
  const materialPrices = { small_box: 50, large_box: 70, tape: 25, bubble_wrap: 400, brown_paper: 400 };
  const materialCost = Object.entries(est.supplies ?? {}).reduce(
    (sum, [k, v]) => sum + (materialPrices[k as keyof typeof materialPrices] ?? 0) * (v ?? 0),
    0
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
    </div>;
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to={`${basePath}/quotes/${quoteId}/view`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-800">搬家計劃書</h1>
          <p className="text-sm text-gray-500">
            {quoteCustomer ? `${quoteCustomer.name} ・ ${quoteCustomer.phone}` : ''}
          </p>
        </div>
        <Link to={`${basePath}/quotes/${quoteId}/plan/view`}
          className="flex items-center gap-1.5 text-sm px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50">
          <Printer size={15} />預覽 / 列印
        </Link>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl disabled:opacity-60">
          <Save size={15} />{saving ? '儲存中...' : '儲存'}
        </button>
      </div>

      <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-xl p-3">
        📋 本計劃書結構依「一條龍搬家新手工具書」模板設計，顧問到府估價完成後填寫，可輸出為列印版本交給搬家執行團隊。
      </p>

      {/* Part 1: 客戶資料 */}
      <Section title="1. 客戶資料" badge="估價表">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="姓名（自報價單帶入）">
            <input value={quoteCustomer?.name ?? ''} disabled className={`${inputCls} bg-gray-50`} />
          </Field>
          <Field label="電話（自報價單帶入）">
            <input value={quoteCustomer?.phone ?? ''} disabled className={`${inputCls} bg-gray-50`} />
          </Field>
          <Field label="預計搬家日">
            <input type="date" value={est.expected_moving_date ?? ''}
              onChange={e => upd('expected_moving_date', e.target.value)} className={inputCls} />
          </Field>
          <Field label="搬家公司進場時間">
            <input type="time" value={est.arrival_time ?? ''}
              onChange={e => upd('arrival_time', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-3 mt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">🏠 舊家地址（自報價單帶入）</p>
          <input value={quoteCustomer?.address_from ?? ''} disabled className={`${inputCls} bg-gray-50 mb-2`} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="電梯">
              <select value={est.old_elevator ?? ''} onChange={e => upd('old_elevator', e.target.value as any)} className={inputCls}>
                <option value="">—</option>
                <option value="none">無電梯</option>
                <option value="has">有電梯</option>
                <option value="freight">有貨梯</option>
              </select>
            </Field>
            <Field label="卸貨區">
              <input value={est.old_loading_area ?? ''} placeholder="地下室 / 路邊臨停 ..."
                onChange={e => upd('old_loading_area', e.target.value)} className={inputCls} />
            </Field>
            <Field label="超過 30M 步行">
              <div className="pt-2">
                <CB checked={!!est.old_over_30m} onChange={v => upd('old_over_30m', v)} label="需收步行費" />
              </div>
            </Field>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">🏡 新家地址（自報價單帶入）</p>
          <input value={quoteCustomer?.address_to ?? ''} disabled className={`${inputCls} bg-gray-50 mb-2`} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="電梯">
              <select value={est.new_elevator ?? ''} onChange={e => upd('new_elevator', e.target.value as any)} className={inputCls}>
                <option value="">—</option>
                <option value="none">無電梯</option>
                <option value="has">有電梯</option>
                <option value="freight">有貨梯</option>
              </select>
            </Field>
            <Field label="卸貨區">
              <input value={est.new_loading_area ?? ''} placeholder="地下室 / 路邊臨停 ..."
                onChange={e => upd('new_loading_area', e.target.value)} className={inputCls} />
            </Field>
            <Field label="超過 30M 步行">
              <div className="pt-2">
                <CB checked={!!est.new_over_30m} onChange={v => upd('new_over_30m', v)} label="需收步行費" />
              </div>
            </Field>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">👨‍👩‍👧 家中成員</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="大人"><input type="number" value={est.family_adults ?? 0} onChange={e => upd('family_adults', +e.target.value)} className={inputCls} /></Field>
            <Field label="小孩"><input type="number" value={est.family_kids ?? 0} onChange={e => upd('family_kids', +e.target.value)} className={inputCls} /></Field>
            <Field label="寵物"><input type="number" value={est.family_pets ?? 0} onChange={e => upd('family_pets', +e.target.value)} className={inputCls} /></Field>
            <Field label="其他"><input value={est.family_other ?? ''} onChange={e => upd('family_other', e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="mt-3">
            <CB checked={!!est.move_in_same_day} onChange={v => upd('move_in_same_day', v)} label="當天入住新家" />
          </div>
        </div>
      </Section>

      {/* Part 2: 大型家具 / 家電 / 防護 */}
      <Section title="2. 注意事項" badge="家具 / 家電 / 防護" defaultOpen={false}>
        {/* 家具 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">大型家具（電視、床架、衣櫃、沙發、鋼琴 ⋯）</p>
            <button type="button" onClick={addFurniture} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <Plus size={12} />新增
            </button>
          </div>
          <div className="space-y-2">
            {(est.large_furniture ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.name} onChange={e => updFurniture(i, { name: e.target.value })}
                  placeholder="名稱" className={`col-span-6 ${inputCls}`} />
                <input type="number" value={item.qty} onChange={e => updFurniture(i, { qty: +e.target.value })}
                  placeholder="數量" className={`col-span-2 ${inputCls}`} />
                <div className="col-span-3">
                  <CB checked={item.need_disassembly} onChange={v => updFurniture(i, { need_disassembly: v })} label="需拆裝" />
                </div>
                <button type="button" onClick={() => delFurniture(i)} className="col-span-1 p-2 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 家電 */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">大型家電（冰箱、洗衣機、除濕機、電腦、電視 ⋯）</p>
            <button type="button" onClick={addAppliance} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <Plus size={12} />新增
            </button>
          </div>
          <div className="space-y-2">
            {(est.large_appliances ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={item.name} onChange={e => updAppliance(i, { name: e.target.value })}
                  placeholder="名稱" className={`col-span-5 ${inputCls}`} />
                <input type="number" value={item.qty} onChange={e => updAppliance(i, { qty: +e.target.value })}
                  placeholder="數量" className={`col-span-2 ${inputCls}`} />
                <input value={item.note ?? ''} onChange={e => updAppliance(i, { note: e.target.value })}
                  placeholder="備註（需斷電 / 除霜 ...）" className={`col-span-4 ${inputCls}`} />
                <button type="button" onClick={() => delAppliance(i)} className="col-span-1 p-2 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 防護 */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">電梯 / 地板防護</p>
          <div className="flex flex-wrap gap-4">
            <CB checked={!!est.elevator_protection} onChange={v => upd('elevator_protection', v)} label="電梯防護" />
            <CB checked={!!est.floor_protection} onChange={v => upd('floor_protection', v)} label="地板防護" />
          </div>
        </div>
      </Section>

      {/* Part 3: 衣服鞋子打包 */}
      <Section title="3. 衣服鞋子打包方式" defaultOpen={false}>
        <div className="flex flex-wrap gap-4">
          <CB checked={!!est.clothes_hanging} onChange={v => upd('clothes_hanging', v)} label="掛衣箱（西裝、洋裝）" />
          <CB checked={!!est.clothes_folded} onChange={v => upd('clothes_folded', v)} label="折疊入紙箱" />
          <CB checked={!!est.clothes_vacuum} onChange={v => upd('clothes_vacuum', v)} label="真空壓縮" />
        </div>
        <Field label="其他說明">
          <input value={est.clothes_other ?? ''} onChange={e => upd('clothes_other', e.target.value)}
            placeholder="例如：鞋子用鞋盒、珠寶另外收..." className={inputCls} />
        </Field>
      </Section>

      {/* Part 4: 包材 / 紙箱 */}
      <Section title="4. 寄送包材 / 紙箱" defaultOpen={false}>
        <Field label="可收件日期（可複選，用逗號分隔）">
          <input value={(est.supplies_dates ?? []).join(', ')}
            onChange={e => upd('supplies_dates', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="2026-05-01, 2026-05-02" className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <CB checked={!!est.mgmt_pickup} onChange={v => upd('mgmt_pickup', v)} label="管理室代收" />
          </div>
          <Field label="管理室電話">
            <input value={est.mgmt_pickup_phone ?? ''} onChange={e => upd('mgmt_pickup_phone', e.target.value)} className={inputCls} />
          </Field>
          <Field label="配送時段">
            <select value={est.delivery_time_slot ?? ''} onChange={e => upd('delivery_time_slot', e.target.value as any)} className={inputCls}>
              <option value="">—</option>
              <option value="am">上午</option>
              <option value="pm">下午</option>
              <option value="anytime">皆可</option>
            </select>
          </Field>
        </div>
      </Section>

      {/* Part 5: 耗材估算 */}
      <Section title="5. 耗材估算" badge={`共 NT$ ${materialCost.toLocaleString()}`} defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <Field label="小紙箱 $50">
            <input type="number" min={0} value={est.supplies?.small_box ?? 0}
              onChange={e => upd('supplies', { ...est.supplies, small_box: +e.target.value })} className={inputCls} />
          </Field>
          <Field label="大紙箱 $70">
            <input type="number" min={0} value={est.supplies?.large_box ?? 0}
              onChange={e => upd('supplies', { ...est.supplies, large_box: +e.target.value })} className={inputCls} />
          </Field>
          <Field label="膠帶 $25">
            <input type="number" min={0} value={est.supplies?.tape ?? 0}
              onChange={e => upd('supplies', { ...est.supplies, tape: +e.target.value })} className={inputCls} />
          </Field>
          <Field label="氣泡紙 $400/半捲">
            <input type="number" min={0} value={est.supplies?.bubble_wrap ?? 0}
              onChange={e => upd('supplies', { ...est.supplies, bubble_wrap: +e.target.value })} className={inputCls} />
          </Field>
          <Field label="土報紙 $400/半包">
            <input type="number" min={0} value={est.supplies?.brown_paper ?? 0}
              onChange={e => upd('supplies', { ...est.supplies, brown_paper: +e.target.value })} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Part 6: 本次服務目標 */}
      <Section title="6. 本次服務目標" badge="一條龍項目" defaultOpen={false}>
        <div className="flex flex-wrap gap-4">
          <CB checked={!!est.service_packing} onChange={v => upd('service_packing', v)} label="物品打包裝箱" />
          <CB checked={!!est.service_moving} onChange={v => upd('service_moving', v)} label="搬家（車輛運輸）" />
          <CB checked={!!est.service_unpacking} onChange={v => upd('service_unpacking', v)} label="物品拆箱上架" />
          <CB checked={!!est.service_screening} onChange={v => upd('service_screening', v)} label="打包前篩選（斷捨離）" />
        </div>
        <div className="border-t border-gray-100 pt-3">
          <Field label="服務當天現場人員（可複選）">
            <div className="flex flex-wrap gap-4">
              {['客戶本人', '家人', '裝潢施工人員', '其他'].map(role => {
                const checked = (est.onsite_staff ?? []).includes(role);
                return (
                  <CB key={role} checked={checked} onChange={v => {
                    const next = v
                      ? [...(est.onsite_staff ?? []), role]
                      : (est.onsite_staff ?? []).filter(r => r !== role);
                    upd('onsite_staff', next);
                  }} label={role} />
                );
              })}
            </div>
          </Field>
          <Field label="其他現場人員說明">
            <input value={est.onsite_staff_other ?? ''} onChange={e => upd('onsite_staff_other', e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Part 7: 空間狀態 */}
      <Section title="7. 空間狀態 / 物品異動" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="服務空間（全室 / 部分 / 不處理的空間）">
            <input value={est.work_space ?? ''} onChange={e => upd('work_space', e.target.value)} className={inputCls} />
          </Field>
          <Field label="坪數相對應">
            <select value={est.size_change ?? ''} onChange={e => upd('size_change', e.target.value as any)} className={inputCls}>
              <option value="">—</option>
              <option value="same">坪數相近</option>
              <option value="small_to_big">小搬大</option>
              <option value="big_to_small">大搬小</option>
            </select>
          </Field>
        </div>

        {/* 物品異動表 */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">物品異動表</p>
            <button type="button" onClick={addMovement} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              <Plus size={12} />新增一項
            </button>
          </div>
          <div className="space-y-2">
            {(est.item_movements ?? []).map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={m.from} onChange={e => updMovement(i, { from: e.target.value })}
                  placeholder="舊家：原空間" className={`col-span-4 ${inputCls}`} />
                <input value={m.name} onChange={e => updMovement(i, { name: e.target.value })}
                  placeholder="物品名稱" className={`col-span-3 ${inputCls}`} />
                <input value={m.to} onChange={e => updMovement(i, { to: e.target.value })}
                  placeholder="新家：異動空間" className={`col-span-4 ${inputCls}`} />
                <button type="button" onClick={() => delMovement(i)} className="col-span-1 p-2 text-red-400 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Part 8: 舊家現況 / 新家現況 */}
      <Section title="8. 舊家現況 / 新家現況" defaultOpen={false}>
        <p className="text-sm font-medium text-gray-700">🏠 舊家現況</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="坪數"><input type="number" value={est.old_area_ping ?? 0} onChange={e => upd('old_area_ping', +e.target.value)} className={inputCls} /></Field>
          <Field label="易碎物品數量"><input type="number" value={est.old_fragile_count ?? 0} onChange={e => upd('old_fragile_count', +e.target.value)} className={inputCls} /></Field>
          <Field label="櫃體外部狀態">
            <select value={est.old_cabinet_outside ?? ''} onChange={e => upd('old_cabinet_outside', e.target.value)} className={inputCls}>
              <option value="">—</option>
              <option value="堆積難走動">物品堆積，行走困難</option>
              <option value="部分散落">部分物體散落地面</option>
              <option value="地面整齊">地面樓面無雜物</option>
            </select>
          </Field>
          <Field label="櫃體內部狀態">
            <select value={est.old_cabinet_inside ?? ''} onChange={e => upd('old_cabinet_inside', e.target.value)} className={inputCls}>
              <option value="">—</option>
              <option value="蔓延至外">蔓延至外面</option>
              <option value="幾乎塞滿">櫃內幾乎塞滿</option>
              <option value="尚有50%空間">尚有 50% 空間</option>
            </select>
          </Field>
          <Field label="照片連結（Google Drive / 雲端）">
            <input value={est.old_photos_url ?? ''} onChange={e => upd('old_photos_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-sm font-medium text-gray-700 mb-2">🏡 新家現況</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="坪數"><input type="number" value={est.new_area_ping ?? 0} onChange={e => upd('new_area_ping', +e.target.value)} className={inputCls} /></Field>
            <Field label="收納空間">
              <select value={est.new_storage_level ?? ''} onChange={e => upd('new_storage_level', e.target.value as any)} className={inputCls}>
                <option value="">—</option>
                <option value="much">收納空間多</option>
                <option value="little">收納空間寡</option>
              </select>
            </Field>
          </div>
          <Field label="新家現有物品狀況（可複選）">
            <div className="flex flex-wrap gap-4">
              <CB checked={!!est.new_item_status?.empty} onChange={v => upd('new_item_status', { ...(est.new_item_status ?? {}), empty: v })} label="全空" />
              <CB checked={!!est.new_item_status?.already_arranged} onChange={v => upd('new_item_status', { ...(est.new_item_status ?? {}), already_arranged: v })} label="已有擺設" />
              <CB checked={!!est.new_item_status?.already_packed} onChange={v => upd('new_item_status', { ...(est.new_item_status ?? {}), already_packed: v })} label="物品已打包" />
            </div>
          </Field>
          <Field label="其他說明">
            <input value={est.new_item_status?.other ?? ''} onChange={e => upd('new_item_status', { ...(est.new_item_status ?? {}), other: e.target.value })} className={inputCls} />
          </Field>
          <Field label="照片連結">
            <input value={est.new_photos_url ?? ''} onChange={e => upd('new_photos_url', e.target.value)} placeholder="https://..." className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* Part 9: 預估人力 */}
      <Section title="9. 預估人力 / 時數" defaultOpen={false}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="預估時數"><input type="number" value={est.estimated_hours ?? 0} onChange={e => upd('estimated_hours', +e.target.value)} className={inputCls} /></Field>
          <Field label="預估人數"><input type="number" value={est.estimated_people ?? 0} onChange={e => upd('estimated_people', +e.target.value)} className={inputCls} /></Field>
          <Field label="預估天數"><input type="number" value={est.estimated_days ?? 0} onChange={e => upd('estimated_days', +e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <CB checked={!!est.need_screening} onChange={v => upd('need_screening', v)} label="包含打包前篩選（斷捨離）" />
          {est.need_screening && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <Field label="篩選時數"><input type="number" value={est.screening_hours ?? 0} onChange={e => upd('screening_hours', +e.target.value)} className={inputCls} /></Field>
              <Field label="篩選人數"><input type="number" value={est.screening_people ?? 0} onChange={e => upd('screening_people', +e.target.value)} className={inputCls} /></Field>
              <Field label="篩選天數"><input type="number" value={est.screening_days ?? 0} onChange={e => upd('screening_days', +e.target.value)} className={inputCls} /></Field>
            </div>
          )}
        </div>
        <Field label="額外備註">
          <textarea value={est.notes ?? ''} rows={3} onChange={e => upd('notes', e.target.value)} className={`${inputCls} resize-none`} />
        </Field>
      </Section>

      {/* Part 10: 執行規劃書 */}
      <Section title="10. 執行規劃書（主整聊師製作）" defaultOpen={false}>
        <Field label="主整聊師">
          <input value={exec.main_consultant ?? ''} onChange={e => setExec({ ...exec, main_consultant: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="導覽時間 開始"><input type="time" value={exec.tour_start ?? ''} onChange={e => setExec({ ...exec, tour_start: e.target.value })} className={inputCls} /></Field>
          <Field label="導覽時間 結束"><input type="time" value={exec.tour_end ?? ''} onChange={e => setExec({ ...exec, tour_end: e.target.value })} className={inputCls} /></Field>
          <Field label="打包時間 開始"><input type="time" value={exec.packing_start ?? ''} onChange={e => setExec({ ...exec, packing_start: e.target.value })} className={inputCls} /></Field>
          <Field label="打包時間 結束"><input type="time" value={exec.packing_end ?? ''} onChange={e => setExec({ ...exec, packing_end: e.target.value })} className={inputCls} /></Field>
          <Field label="上架時間 開始"><input type="time" value={exec.loading_start ?? ''} onChange={e => setExec({ ...exec, loading_start: e.target.value })} className={inputCls} /></Field>
          <Field label="上架時間 結束"><input type="time" value={exec.loading_end ?? ''} onChange={e => setExec({ ...exec, loading_end: e.target.value })} className={inputCls} /></Field>
        </div>
        <Field label="貼標作法（編號 / 顏色 / 英文字）">
          <textarea value={exec.labeling_method ?? ''} rows={2} onChange={e => setExec({ ...exec, labeling_method: e.target.value })} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="交通方式">
          <input value={exec.transportation ?? ''} onChange={e => setExec({ ...exec, transportation: e.target.value })} className={inputCls} />
        </Field>
        <Field label="收尾說明">
          <textarea value={exec.cleanup_note ?? ''} rows={2} onChange={e => setExec({ ...exec, cleanup_note: e.target.value })} className={`${inputCls} resize-none`} />
        </Field>
      </Section>

      {/* Part 11: 實際執行回顧 */}
      <Section title="11. 實際執行回顧" defaultOpen={false}>
        <Field label="實際時間 / 空間 / 人力安排">
          <textarea value={review.actual_summary ?? ''} rows={3} onChange={e => setReview({ ...review, actual_summary: e.target.value })} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="執行分配 vs 規劃的落差原因">
          <textarea value={review.gap_analysis ?? ''} rows={3} onChange={e => setReview({ ...review, gap_analysis: e.target.value })} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="整聊師心情旅程">
          <textarea value={review.mood_journey ?? ''} rows={3} onChange={e => setReview({ ...review, mood_journey: e.target.value })} className={`${inputCls} resize-none`} />
        </Field>
      </Section>

      {/* Bottom save */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 lg:-mx-6 flex items-center justify-end gap-2">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl disabled:opacity-60">
          <Save size={15} />{saving ? '儲存中...' : '儲存搬家計劃書'}
        </button>
      </div>
    </div>
  );
}
