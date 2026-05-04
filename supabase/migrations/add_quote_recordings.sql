-- ════════════════════════════════════════════════════════════════════════════
-- 報價錄音 — 顧問與客戶通話錄音 + 自動轉逐字稿 + 解析報價資訊
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.bubu_quote_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 後台建立者
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consultant_id UUID REFERENCES public.bubu_consultants(id) ON DELETE SET NULL,

  -- 標題（顧問可手動命名，預設用客戶姓名 + 時間）
  title TEXT NOT NULL DEFAULT '',
  customer_name TEXT,    -- 暫存客戶姓名（在轉成報價單前用）
  phone TEXT,            -- 暫存電話

  -- 音檔
  audio_url TEXT,                         -- Supabase Storage path
  audio_duration_sec INT,                 -- 錄音長度（秒）
  audio_size_bytes BIGINT,

  -- 轉錄與解析
  status TEXT NOT NULL DEFAULT 'recording'
    CHECK (status IN ('recording', 'uploaded', 'transcribing', 'transcribed', 'extracting', 'done', 'failed', 'converted')),
  transcript TEXT,                        -- 逐字稿（純文字）
  transcript_segments JSONB,              -- [{start, end, text}, ...]（含時間戳）
  extracted_data JSONB,                   -- 解析結果：{customer_name, phone, address_from, address_to, moving_date, notes, ...}
  error_message TEXT,                     -- 失敗原因

  -- 轉成報價單後關聯
  quote_id UUID REFERENCES public.bubu_quotes(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- 30 天後可從後台清除（仍保留 storage 音檔，需另外管理）
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_recordings_status ON public.bubu_quote_recordings(status);
CREATE INDEX IF NOT EXISTS idx_quote_recordings_created_by ON public.bubu_quote_recordings(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_quote_recordings_consultant ON public.bubu_quote_recordings(consultant_id);
CREATE INDEX IF NOT EXISTS idx_quote_recordings_created_at ON public.bubu_quote_recordings(created_at DESC);

-- RLS：所有後台角色（admin / manager / consultant）可讀寫
ALTER TABLE public.bubu_quote_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_recordings_staff_all" ON public.bubu_quote_recordings;
CREATE POLICY "quote_recordings_staff_all" ON public.bubu_quote_recordings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bubu_app_users
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'consultant')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bubu_app_users
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'consultant')
  ));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_quote_recording_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_recording_updated_at ON public.bubu_quote_recordings;
CREATE TRIGGER trg_quote_recording_updated_at
  BEFORE UPDATE ON public.bubu_quote_recordings
  FOR EACH ROW EXECUTE FUNCTION public.touch_quote_recording_updated_at();

COMMENT ON TABLE public.bubu_quote_recordings IS '報價錄音與逐字稿';
COMMENT ON COLUMN public.bubu_quote_recordings.status IS 'recording=錄音中, uploaded=已上傳, transcribing=轉錄中, transcribed=已轉錄, extracting=AI 解析中, done=完成, failed=失敗, converted=已轉成報價單';
