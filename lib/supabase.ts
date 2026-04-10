import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Table Names（加 bubu_ 前綴，避免與其他網站衝突）────────────────────────
export const T = {
  users:          'bubu_app_users',
  slots:          'bubu_time_slots',
  bookings:       'bubu_bookings',
  quotes:         'bubu_quotes',
  quoteItems:     'bubu_quote_items',
  noteTemplates:  'bubu_quote_note_templates',
  checkedNotes:   'bubu_quote_checked_notes',
  consultants:    'bubu_consultants',
  slotConsultants:'bubu_slot_consultants',
  staffSchedule:  'bubu_staff_schedule_items',
  quoteSchedule:  'bubu_quote_schedule_items',
  goals:          'bubu_consultant_goals',
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
  category: '搬家車趟費' | '打包計時人員' | '包材費';
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
  total: number;
  deposit: number;
  status: '草稿' | '已發送' | '已確認' | '已取消';
  internal_notes: string | null;
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
  work_date: string;
  start_time: string;
  end_time: string;
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
