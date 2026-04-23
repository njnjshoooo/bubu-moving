-- ═══════════════════════════════════════════════════════════════════════════
-- 搬家計劃書（一條龍搬家新手工具書）
-- 每份報價單可對應一份搬家計劃書，包含估價表、執行規劃書、實際執行三部分
-- 以 JSONB 儲存表單內容，保留彈性以因應模板調整
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bubu_moving_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.bubu_quotes(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES public.bubu_consultants(id) ON DELETE SET NULL,

  -- 三大區塊的結構化資料（JSONB 彈性存放）
  estimation   JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Part 1: 估價表
  execution    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Part 2: 執行規劃書
  review       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Part 3: 實際執行

  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 一份報價單最多一份計劃書
CREATE UNIQUE INDEX IF NOT EXISTS uniq_moving_plan_per_quote
  ON public.bubu_moving_plans(quote_id);

-- RLS：authenticated 用戶可讀寫（跟報價單權限一致）
ALTER TABLE public.bubu_moving_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "moving_plans_auth_all" ON public.bubu_moving_plans;
CREATE POLICY "moving_plans_auth_all" ON public.bubu_moving_plans
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_moving_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_moving_plan_updated_at ON public.bubu_moving_plans;
CREATE TRIGGER trg_moving_plan_updated_at
  BEFORE UPDATE ON public.bubu_moving_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_moving_plan_updated_at();

COMMENT ON TABLE public.bubu_moving_plans IS '搬家計劃書（估價表 + 執行規劃書 + 實際執行）';
COMMENT ON COLUMN public.bubu_moving_plans.estimation IS '估價表資料（客戶資料、家具家電、包材、空間評估、人力預估）';
COMMENT ON COLUMN public.bubu_moving_plans.execution IS '執行規劃書（人力分工、時間規劃）';
COMMENT ON COLUMN public.bubu_moving_plans.review IS '實際執行（回顧檢討）';
