import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  role: 'admin' | 'member';
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
  service_type: string;
  notes: string | null;
  status: '待確認' | '已確認' | '進行中' | '已完成' | '已取消';
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
  address_to: string | null;
  subtotal: number;
  total: number;
  status: '草稿' | '已發送' | '已確認' | '已取消';
  internal_notes: string | null;
  created_at: string;
  quote_items?: QuoteItem[];
  bookings?: Booking;
}
