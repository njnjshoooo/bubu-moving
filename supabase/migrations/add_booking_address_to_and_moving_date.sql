-- 新增預約單欄位：新址、預計搬家日
ALTER TABLE public.bubu_bookings
  ADD COLUMN IF NOT EXISTS address_to TEXT,
  ADD COLUMN IF NOT EXISTS address_to_city TEXT,
  ADD COLUMN IF NOT EXISTS address_to_district TEXT,
  ADD COLUMN IF NOT EXISTS address_to_detail TEXT,
  ADD COLUMN IF NOT EXISTS moving_date DATE;

COMMENT ON COLUMN public.bubu_bookings.address_to IS '新址（完整字串，縣市+行政區+詳細）';
COMMENT ON COLUMN public.bubu_bookings.moving_date IS '預計搬家日';
