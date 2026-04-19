// Google Calendar 同步 helper
// 靜默失敗 — GCal 未連線或失敗時不應影響主要預約流程
import { supabase } from './supabase';

export async function syncBookingToGcal(bookingId: string, action: 'upsert' | 'delete' = 'upsert') {
  try {
    await supabase.functions.invoke('gcal-sync-booking', {
      body: { action, booking_id: bookingId },
    });
  } catch (err) {
    // 故意吞錯 — GCal 同步失敗不能阻擋使用者操作
    console.warn('[gcal-sync] failed (non-fatal):', err);
  }
}
