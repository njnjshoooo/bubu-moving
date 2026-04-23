import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Table Names（加 bubu_ 前綴，避免與其他網站衝突）────────────────────────
export const T = {
  users:                'bubu_app_users',
  slots:                'bubu_time_slots',
  bookings:             'bubu_bookings',
  quotes:               'bubu_quotes',
  quoteItems:           'bubu_quote_items',
  noteTemplates:        'bubu_quote_note_templates',
  checkedNotes:         'bubu_quote_checked_notes',
  consultants:          'bubu_consultants',
  slotConsultants:      'bubu_slot_consultants',
  staffSchedule:        'bubu_staff_schedule_items',
  quoteSchedule:        'bubu_quote_schedule_items',
  goals:                'bubu_consultant_goals',
  notificationSettings: 'bubu_notification_settings',
  estimates:            'bubu_estimates',
  products:             'bubu_products',
  orders:               'bubu_orders',
  caseStudies:          'bubu_case_studies',
  settlementSheets:     'bubu_settlement_sheets',
  settlementItems:      'bubu_settlement_items',
  movingPlans:          'bubu_moving_plans',
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  role: 'admin' | 'manager' | 'consultant' | 'member';
  display_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_bookings: number;
  max_waitlist: number;
  current_bookings: number;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  user_id: string | null;
  time_slot_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  address_from: string | null;
  city: string | null;
  district: string | null;
  address_detail: string | null;
  address_to: string | null;
  address_to_city: string | null;
  address_to_district: string | null;
  address_to_detail: string | null;
  moving_date: string | null;
  service_type: string;
  notes: string | null;
  status: '待確認' | '已確認' | '進行中' | '已完成' | '已取消';
  is_waitlist: boolean;
  assigned_consultant_id: string | null;
  created_at: string;
  time_slots?: TimeSlot;
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  category: '搬家車趟費' | '計時人員' | '包材費' | string;
  name: string;
  unit_price: number;
  quantity: number;
  sort_order: number;
}

export interface NoteTemplate {
  id: string;
  content: string;
  sort_order: number;
  is_active: boolean;
}

export interface Quote {
  id: string;
  booking_id: string | null;
  quote_number: string;
  customer_name: string;
  phone: string;
  email: string | null;
  tax_id: string | null;
  company_name: string | null;
  address_from: string | null;
  address_from_type: string | null;
  address_from_parking: string | null;
  address_from_basement: string | null;
  address_from_guard: string | null;
  address_to: string | null;
  address_to_type: string | null;
  address_to_parking: string | null;
  address_to_basement: string | null;
  address_to_guard: string | null;
  consultant_name: string | null;
  consultant_phone: string | null;
  consultant_id: string | null;
  customer_user_id: string | null;
  payment_link: string | null;
  payment_status: string | null;
  subtotal: number;
  discount: number | null;
  total: number;
  deposit: number;
  status: '草稿' | '已發送' | '已確認' | '已取消';
  internal_notes: string | null;
  remark_notes: string | null;
  created_at: string;
  quote_items?: QuoteItem[];
  staff_schedule_items?: StaffScheduleItem[];
  quote_schedule_items?: QuoteScheduleItem[];
  bookings?: Booking;
  consultant?: { display_name: string } | null;
}

export interface ConsultantGoal {
  id: string;
  consultant_id: string;
  year: number;
  month: number;
  monthly_target: number;
  created_at: string;
}

export interface Consultant {
  id: string;
  user_id: string;
  display_name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StaffScheduleItem {
  id: string;
  quote_id: string;
  item_name: string;
  work_date: string;
  start_time: string;
  end_time: string;
  break_hours: number;
  person_count: number;
  unit_price: number;
  sort_order: number;
}

export interface QuoteScheduleItem {
  id: string;
  quote_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  label: string;
  category: string;
  sort_order: number;
}

export interface NotificationSetting {
  id: string;
  email: string;
  label: string | null;
  notify_booking: boolean;
  notify_quote: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Estimate {
  id: string;
  user_id: string;
  service_type: string | null;
  area: number;
  room_type: string | null;
  elevator_status: string | null;
  density: string | null;
  estimated_trucks: number;
  estimated_people: number;
  estimated_hours: number;
  truck_cost: number;
  labor_cost: number;
  supply_cost: number;
  estimated_total: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  specs: string | null;
  usage_tip: string | null;
  image_url: string | null;
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  items: any[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  category: string;
  location: string | null;
  work_date: string | null;
  image_url: string | null;
  description: string | null;
  testimonial: string | null;
  author: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
}

export interface SettlementSheet {
  id: string;
  quote_id: string | null;
  customer_name: string;
  consultant_name: string;
  move_datetime: string;
  address_old: string;
  address_new: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SettlementItem {
  id: string;
  sheet_id: string;
  section: 'work' | 'supply';
  name: string;
  unit_price: number;
  estimated_qty: number;
  actual_qty: number;
  sort_order: number;
}

// ─── 搬家計劃書（一條龍搬家新手工具書）──────────────────────────────────────
export interface MovingPlan {
  id: string;
  quote_id: string;
  consultant_id: string | null;
  estimation: MovingPlanEstimation;
  execution: MovingPlanExecution;
  review: MovingPlanReview;
  status: 'draft' | 'confirmed' | 'completed';
  created_at: string;
  updated_at: string;
}

// Part 1: 估價表
export interface MovingPlanEstimation {
  // 客戶資料
  expected_moving_date?: string;
  arrival_time?: string;
  // 舊家
  old_elevator?: 'none' | 'has' | 'freight' | '';
  old_loading_area?: string;
  old_over_30m?: boolean;
  // 新家
  new_elevator?: 'none' | 'has' | 'freight' | '';
  new_loading_area?: string;
  new_over_30m?: boolean;
  // 家中成員
  family_adults?: number;
  family_kids?: number;
  family_pets?: number;
  family_other?: string;
  move_in_same_day?: boolean;
  // 大型家具（每項：名稱 + 數量 + 是否需拆裝）
  large_furniture?: { name: string; qty: number; need_disassembly: boolean }[];
  // 大型家電
  large_appliances?: { name: string; qty: number; note?: string }[];
  // 電梯/地板防護
  elevator_protection?: boolean;
  floor_protection?: boolean;
  // 衣服鞋子打包方式
  clothes_hanging?: boolean;       // 掛衣箱
  clothes_folded?: boolean;        // 折疊入紙箱
  clothes_vacuum?: boolean;        // 真空壓縮
  clothes_other?: string;
  // 寄送包材
  supplies_dates?: string[];       // 可收件日期
  mgmt_pickup?: boolean;
  mgmt_pickup_phone?: string;
  delivery_time_slot?: 'am' | 'pm' | 'anytime' | '';
  // 耗材估算
  supplies: {
    small_box?: number;            // 小紙箱 $50
    large_box?: number;            // 大紙箱 $70
    tape?: number;                 // 膠帶 $25
    bubble_wrap?: number;          // 氣泡紙 $400/半捲
    brown_paper?: number;          // 土報紙 $400/半包
  };
  // 服務目標
  service_packing?: boolean;       // 物品打包裝箱
  service_moving?: boolean;        // 搬家
  service_unpacking?: boolean;     // 物品拆箱上架
  service_screening?: boolean;     // 打包前篩選
  // 現場人員
  onsite_staff?: string[];         // 客戶本人 / 家人 / 裝潢施工人員 / 其他
  onsite_staff_other?: string;
  // 空間狀態
  work_space?: string;             // 全室 / 不處理的空間或物品
  size_change?: 'same' | 'small_to_big' | 'big_to_small' | '';
  // 物品異動
  item_movements?: { from: string; name: string; to: string }[];
  // 舊家現況
  old_area_ping?: number;
  old_cabinet_outside?: string;    // 堆積難走動 / 部分散落 / 地面整齊
  old_cabinet_inside?: string;     // 蔓延至外 / 幾乎塞滿 / 尚有50%空間
  old_fragile_count?: number;
  old_photos_url?: string;
  // 新家現況
  new_area_ping?: number;
  new_storage_level?: 'much' | 'little' | '';
  new_item_status?: {
    empty?: boolean;               // 全空
    already_arranged?: boolean;    // 已有擺設
    already_packed?: boolean;      // 物品已打包
    other?: string;
  };
  new_photos_url?: string;
  // 預估人力
  estimated_hours?: number;
  estimated_people?: number;
  estimated_days?: number;
  need_screening?: boolean;
  screening_hours?: number;
  screening_people?: number;
  screening_days?: number;
  // 額外備註
  notes?: string;
}

// Part 2: 執行規劃書（主整聊師填）
export interface MovingPlanExecution {
  main_consultant?: string;
  staff_assignments?: {
    role: string;                  // 封箱手 / 舊家收尾人 / 新家對接人 / 其他
    name: string;
    note?: string;
  }[];
  tour_start?: string;
  tour_end?: string;
  packing_start?: string;
  packing_end?: string;
  labeling_method?: string;        // 貼標作法
  break_start?: string;
  break_end?: string;
  transportation?: string;
  loading_start?: string;
  loading_end?: string;
  cleanup_note?: string;
  total_fee_note?: string;
}

// Part 3: 實際執行回顧
export interface MovingPlanReview {
  actual_summary?: string;
  gap_analysis?: string;
  mood_journey?: string;
}
