-- ════════════════════════════════════════════════════════════════════════════
-- Google Calendar 雙向同步整合
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Google Calendar 連線設定（全系統共用一組）
CREATE TABLE IF NOT EXISTS public.bubu_gcal_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  calendar_id TEXT,                   -- 選定的 Google Calendar ID
  calendar_summary TEXT,              -- 方便顯示的 Calendar 名稱

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  connected_email TEXT,               -- 授權者的 Google 帳號
  connected_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Webhook 訂閱資訊（反向同步用）
  webhook_channel_id TEXT,
  webhook_resource_id TEXT,
  webhook_expires_at TIMESTAMPTZ,

  -- 同步追蹤
  last_sync_token TEXT,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 強制 singleton（只能有 1 筆設定）
CREATE UNIQUE INDEX IF NOT EXISTS bubu_gcal_config_singleton
  ON public.bubu_gcal_config ((true));

-- 2. 為預約單加上 Google Calendar event ID
ALTER TABLE public.bubu_bookings
  ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bubu_bookings_gcal_event
  ON public.bubu_bookings(gcal_event_id)
  WHERE gcal_event_id IS NOT NULL;

-- 3. RLS：僅最高管理者可讀寫 gcal_config
ALTER TABLE public.bubu_gcal_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gcal_config_admin_all" ON public.bubu_gcal_config;
CREATE POLICY "gcal_config_admin_all" ON public.bubu_gcal_config
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bubu_app_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bubu_app_users WHERE id = auth.uid() AND role = 'admin'));

COMMENT ON TABLE  public.bubu_gcal_config IS 'Google Calendar 整合設定（singleton）';
COMMENT ON COLUMN public.bubu_bookings.gcal_event_id IS '對應的 Google Calendar event ID';
