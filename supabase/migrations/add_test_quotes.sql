-- 測試報價單：整合報價單＋計劃書＋錄音資訊的統一視圖
-- 客戶 / 整聊師 / 搬家公司 都看得懂的格式
create table if not exists bubu_test_quotes (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references bubu_quotes(id) on delete cascade unique,

  -- ① 行程表（auto from bubu_quote_schedule_items + 額外手動補充）
  -- ② 收費項目分類（packing / staff / moving / other）
  fee_categories jsonb default '{"packing":[],"staff":[],"moving":[],"other":[]}'::jsonb,

  -- ④ 地點細節（補充 quotes 沒有的欄位：地下室高度等）
  old_basement_height text,    -- 例：B1 高度 2.2M
  new_basement_height text,
  old_temp_parking text,       -- 是否有臨停區
  new_temp_parking text,

  -- ⑤ 物品處理細節
  items_not_to_move jsonb default '[]'::jsonb,        -- [{"name":"床墊","reason":"不搬走"}]
  special_protection jsonb default '[]'::jsonb,       -- [{"name":"水晶洞","method":"氣泡袋包覆"}]

  -- ⑥ 客戶在意的點
  customer_concerns jsonb default '[]'::jsonb,        -- ["寵物在籠","客戶 14:00 後外出"]

  -- ⑦ 內部備註（不對客戶顯示）
  internal_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table bubu_test_quotes enable row level security;

create policy "Admin/consultant manage test quotes"
  on bubu_test_quotes for all
  using ((select role from bubu_app_users where id = auth.uid()) in ('admin','manager','consultant'))
  with check ((select role from bubu_app_users where id = auth.uid()) in ('admin','manager','consultant'));

create index if not exists idx_test_quotes_quote on bubu_test_quotes(quote_id);
