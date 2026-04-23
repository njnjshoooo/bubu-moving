import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Edit } from 'lucide-react';
import { supabase, T, MovingPlan, MovingPlanEstimation, MovingPlanExecution, MovingPlanReview } from '../../lib/supabase';
import { useBasePath } from '../../lib/useBasePath';

const elevatorLabel: Record<string, string> = { none: '無電梯', has: '有電梯', freight: '有貨梯' };
const sizeChangeLabel: Record<string, string> = { same: '坪數相近', small_to_big: '小搬大', big_to_small: '大搬小' };
const storageLevelLabel: Record<string, string> = { much: '收納空間多', little: '收納空間寡' };
const deliverySlotLabel: Record<string, string> = { am: '上午', pm: '下午', anytime: '皆可' };

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-3 text-sm">
    <span className="text-gray-500 shrink-0 w-28">{label}：</span>
    <span className="text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</span>
  </div>
);

const Header: React.FC<{ title: string; num?: string }> = ({ title, num }) => (
  <div className="border-l-4 border-brand-500 pl-3 mb-3 mt-6 first:mt-0 print:mt-4">
    <h2 className="text-lg font-bold text-gray-900">
      {num && <span className="text-brand-500 mr-2">{num}</span>}
      {title}
    </h2>
  </div>
);

export default function MovingPlanView() {
  const { quoteId } = useParams();
  const basePath = useBasePath();
  const [plan, setPlan] = useState<MovingPlan | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quoteId) return;
    (async () => {
      const [{ data: q }, { data: p }] = await Promise.all([
        supabase.from(T.quotes).select('*').eq('id', quoteId).maybeSingle(),
        supabase.from(T.movingPlans).select('*').eq('quote_id', quoteId).maybeSingle(),
      ]);
      setQuote(q);
      setPlan(p as MovingPlan | null);
      setLoading(false);
    })();
  }, [quoteId]);

  if (loading) return <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent" />
  </div>;

  if (!plan) return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-12 text-center">
      <p className="text-gray-500 mb-4">尚未建立搬家計劃書</p>
      <Link to={`${basePath}/quotes/${quoteId}/plan`}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl">
        <Edit size={15} />開始建立
      </Link>
    </div>
  );

  const est: MovingPlanEstimation = plan.estimation ?? { supplies: {} };
  const exec: MovingPlanExecution = plan.execution ?? {};
  const review: MovingPlanReview = plan.review ?? {};
  const supplies = est.supplies ?? {};

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top actions (hidden when printing) */}
      <div className="flex items-center gap-3 mb-4 no-print">
        <Link to={`${basePath}/quotes/${quoteId}/view`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">搬家計劃書 — 預覽</h1>
          <p className="text-xs text-gray-500">建議用 A4 直向、邊界最小值列印</p>
        </div>
        <Link to={`${basePath}/quotes/${quoteId}/plan`}
          className="flex items-center gap-1.5 text-sm px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50">
          <Edit size={15} />編輯
        </Link>
        <button onClick={() => window.print()}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl">
          <Printer size={15} />列印
        </button>
      </div>

      {/* Printable content */}
      <div id="plan-print" className="bg-white rounded-2xl p-8 print:p-0 print:shadow-none space-y-4">
        {/* Title */}
        <div className="text-center border-b-2 border-brand-500 pb-4 mb-6">
          <p className="text-xs tracking-widest text-brand-600 mb-1">MOVING PLAN</p>
          <h1 className="text-2xl font-bold text-gray-900">一條龍搬家計劃書</h1>
          <p className="text-sm text-gray-500 mt-1">報價單號：{quote?.quote_number ?? '—'}</p>
        </div>

        {/* 1. 客戶資料 */}
        <Header title="客戶資料" num="①" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <Row label="姓名" value={quote?.customer_name} />
          <Row label="電話" value={quote?.phone} />
          <Row label="預計搬家日" value={est.expected_moving_date} />
          <Row label="搬家公司進場時間" value={est.arrival_time} />
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">🏠 舊家</p>
          <Row label="地址" value={quote?.address_from} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 mt-1">
            <Row label="電梯" value={est.old_elevator ? elevatorLabel[est.old_elevator] : undefined} />
            <Row label="卸貨區" value={est.old_loading_area} />
            <Row label="步行 >30M" value={est.old_over_30m ? '需收步行費' : '不需'} />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">🏡 新家</p>
          <Row label="地址" value={quote?.address_to} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 mt-1">
            <Row label="電梯" value={est.new_elevator ? elevatorLabel[est.new_elevator] : undefined} />
            <Row label="卸貨區" value={est.new_loading_area} />
            <Row label="步行 >30M" value={est.new_over_30m ? '需收步行費' : '不需'} />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">家中成員</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1">
            <Row label="大人" value={est.family_adults} />
            <Row label="小孩" value={est.family_kids} />
            <Row label="寵物" value={est.family_pets} />
            <Row label="當天入住" value={est.move_in_same_day ? '是' : '否'} />
          </div>
          {est.family_other && <Row label="其他說明" value={est.family_other} />}
        </div>

        {/* 2. 家具 / 家電 */}
        <Header title="家具 / 家電 / 防護" num="②" />
        {est.large_furniture && est.large_furniture.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-2">大型家具</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left px-3 py-2">名稱</th>
                  <th className="text-center px-3 py-2 w-20">數量</th>
                  <th className="text-center px-3 py-2 w-24">需拆裝</th>
                </tr>
              </thead>
              <tbody>
                {est.large_furniture.map((f, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2">{f.name}</td>
                    <td className="text-center px-3 py-2">{f.qty}</td>
                    <td className="text-center px-3 py-2">{f.need_disassembly ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {est.large_appliances && est.large_appliances.length > 0 && (
          <div className="mt-3">
            <p className="font-semibold text-gray-700 mb-2">大型家電</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left px-3 py-2">名稱</th>
                  <th className="text-center px-3 py-2 w-20">數量</th>
                  <th className="text-left px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {est.large_appliances.map((a, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="text-center px-3 py-2">{a.qty}</td>
                    <td className="px-3 py-2 text-gray-500">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-6 mt-3">
          <Row label="電梯防護" value={est.elevator_protection ? '需要' : '不需要'} />
          <Row label="地板防護" value={est.floor_protection ? '需要' : '不需要'} />
        </div>

        {/* 3. 衣服鞋子打包 */}
        <Header title="衣服鞋子打包方式" num="③" />
        <p className="text-sm">
          {[
            est.clothes_hanging && '掛衣箱',
            est.clothes_folded && '折疊入紙箱',
            est.clothes_vacuum && '真空壓縮',
          ].filter(Boolean).join('、') || '—'}
        </p>
        {est.clothes_other && <Row label="其他說明" value={est.clothes_other} />}

        {/* 4. 包材配送 */}
        <Header title="包材 / 紙箱配送" num="④" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <Row label="可收件日期" value={est.supplies_dates?.join('、')} />
          <Row label="配送時段" value={est.delivery_time_slot ? deliverySlotLabel[est.delivery_time_slot] : undefined} />
          <Row label="管理室代收" value={est.mgmt_pickup ? '是' : '否'} />
          <Row label="管理室電話" value={est.mgmt_pickup_phone} />
        </div>

        {/* 5. 耗材估算 */}
        <Header title="耗材估算" num="⑤" />
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-200">
              <th className="text-left px-3 py-2">品項</th>
              <th className="text-center px-3 py-2">單價</th>
              <th className="text-center px-3 py-2">數量</th>
              <th className="text-right px-3 py-2">小計</th>
            </tr>
          </thead>
          <tbody>
            {[
              { k: 'small_box',    name: '小紙箱',            price: 50 },
              { k: 'large_box',    name: '大紙箱',            price: 70 },
              { k: 'tape',         name: '膠帶',              price: 25 },
              { k: 'bubble_wrap',  name: '氣泡紙（半捲）',    price: 400 },
              { k: 'brown_paper',  name: '土報紙（半包）',    price: 400 },
            ].map(({ k, name, price }) => {
              const qty = (supplies as any)[k] ?? 0;
              return (
                <tr key={k} className="border-b border-gray-100">
                  <td className="px-3 py-2">{name}</td>
                  <td className="text-center px-3 py-2">${price}</td>
                  <td className="text-center px-3 py-2">{qty}</td>
                  <td className="text-right px-3 py-2">${(price * qty).toLocaleString()}</td>
                </tr>
              );
            })}
            <tr className="bg-brand-50 font-bold">
              <td colSpan={3} className="text-right px-3 py-2">合計</td>
              <td className="text-right px-3 py-2 text-brand-600">
                ${Object.entries(supplies).reduce((sum, [k, v]) => sum + ({ small_box: 50, large_box: 70, tape: 25, bubble_wrap: 400, brown_paper: 400 } as any)[k] * (v ?? 0), 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 6. 服務目標 */}
        <Header title="本次服務目標" num="⑥" />
        <p className="text-sm">
          {[
            est.service_packing && '物品打包裝箱',
            est.service_moving && '搬家（車輛運輸）',
            est.service_unpacking && '物品拆箱上架',
            est.service_screening && '打包前篩選（斷捨離）',
          ].filter(Boolean).join('、') || '—'}
        </p>
        <Row label="現場人員" value={(est.onsite_staff ?? []).join('、')} />
        {est.onsite_staff_other && <Row label="其他說明" value={est.onsite_staff_other} />}

        {/* 7. 空間狀態 */}
        <Header title="空間狀態 / 物品異動" num="⑦" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
          <Row label="服務空間" value={est.work_space} />
          <Row label="坪數相對應" value={est.size_change ? sizeChangeLabel[est.size_change] : undefined} />
        </div>
        {est.item_movements && est.item_movements.length > 0 && (
          <div className="mt-2">
            <p className="font-semibold text-gray-700 mb-2">物品異動表</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="text-left px-3 py-2">舊家：原空間</th>
                  <th className="text-left px-3 py-2">物品</th>
                  <th className="text-left px-3 py-2">新家：異動空間</th>
                </tr>
              </thead>
              <tbody>
                {est.item_movements.map((m, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2">{m.from}</td>
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2">{m.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 8. 現況 */}
        <Header title="舊家 / 新家現況" num="⑧" />
        <div>
          <p className="font-semibold text-gray-700 mb-2">🏠 舊家</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="坪數" value={est.old_area_ping} />
            <Row label="易碎物品數量" value={est.old_fragile_count} />
            <Row label="櫃體外部" value={est.old_cabinet_outside} />
            <Row label="櫃體內部" value={est.old_cabinet_inside} />
          </div>
          {est.old_photos_url && (
            <div className="mt-1 text-sm">
              <span className="text-gray-500">照片：</span>
              <a href={est.old_photos_url} target="_blank" rel="noreferrer" className="text-brand-600 underline break-all">{est.old_photos_url}</a>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="font-semibold text-gray-700 mb-2">🏡 新家</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <Row label="坪數" value={est.new_area_ping} />
            <Row label="收納空間" value={est.new_storage_level ? storageLevelLabel[est.new_storage_level] : undefined} />
          </div>
          <Row label="物品狀況" value={[
            est.new_item_status?.empty && '全空',
            est.new_item_status?.already_arranged && '已有擺設',
            est.new_item_status?.already_packed && '物品已打包',
          ].filter(Boolean).join('、')} />
          {est.new_item_status?.other && <Row label="其他" value={est.new_item_status.other} />}
          {est.new_photos_url && (
            <div className="mt-1 text-sm">
              <span className="text-gray-500">照片：</span>
              <a href={est.new_photos_url} target="_blank" rel="noreferrer" className="text-brand-600 underline break-all">{est.new_photos_url}</a>
            </div>
          )}
        </div>

        {/* 9. 人力預估 */}
        <Header title="預估人力" num="⑨" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
          <Row label="預估時數" value={est.estimated_hours ? `${est.estimated_hours} 小時` : undefined} />
          <Row label="預估人數" value={est.estimated_people ? `${est.estimated_people} 人` : undefined} />
          <Row label="預估天數" value={est.estimated_days ? `${est.estimated_days} 天` : undefined} />
        </div>
        {est.need_screening && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="font-semibold text-gray-700 mb-2">打包前篩選</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1">
              <Row label="篩選時數" value={est.screening_hours ? `${est.screening_hours} 小時` : undefined} />
              <Row label="篩選人數" value={est.screening_people ? `${est.screening_people} 人` : undefined} />
              <Row label="篩選天數" value={est.screening_days ? `${est.screening_days} 天` : undefined} />
            </div>
          </div>
        )}
        {est.notes && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-3 text-sm">
            <p className="font-semibold text-yellow-800 mb-1">📌 備註</p>
            <p className="text-yellow-900 whitespace-pre-wrap">{est.notes}</p>
          </div>
        )}

        {/* 10. 執行規劃 */}
        {(exec.main_consultant || exec.packing_start || exec.transportation) && (
          <>
            <Header title="執行規劃書" num="⑩" />
            <Row label="主整聊師" value={exec.main_consultant} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 mt-2">
              <Row label="導覽" value={exec.tour_start && exec.tour_end ? `${exec.tour_start}–${exec.tour_end}` : undefined} />
              <Row label="打包" value={exec.packing_start && exec.packing_end ? `${exec.packing_start}–${exec.packing_end}` : undefined} />
              <Row label="上架" value={exec.loading_start && exec.loading_end ? `${exec.loading_start}–${exec.loading_end}` : undefined} />
            </div>
            {exec.labeling_method && (
              <div className="mt-2">
                <Row label="貼標作法" value={exec.labeling_method} />
              </div>
            )}
            {exec.transportation && <Row label="交通方式" value={exec.transportation} />}
            {exec.cleanup_note && <Row label="收尾說明" value={exec.cleanup_note} />}
          </>
        )}

        {/* 11. 實際執行回顧 */}
        {(review.actual_summary || review.gap_analysis || review.mood_journey) && (
          <>
            <Header title="實際執行回顧" num="⑪" />
            {review.actual_summary && <Row label="實際安排" value={<span className="whitespace-pre-wrap">{review.actual_summary}</span>} />}
            {review.gap_analysis && <Row label="落差分析" value={<span className="whitespace-pre-wrap">{review.gap_analysis}</span>} />}
            {review.mood_journey && <Row label="心情旅程" value={<span className="whitespace-pre-wrap">{review.mood_journey}</span>} />}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4 mt-6">
          步步搬家 BuBu Moving ・ 02 7755 0920 ・ service@tidyman.tw
        </div>
      </div>
    </div>
  );
}
