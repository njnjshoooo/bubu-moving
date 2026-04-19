-- ════════════════════════════════════════════════════════════════════════════
-- 修復：建立新 auth.users 時 handle_new_user trigger 失敗導致
-- "Database error creating new user"
--
-- 做法：
-- 1. trigger 改為 defensive 版本（讀 metadata.role、ON CONFLICT DO NOTHING、
--    EXCEPTION 捕捉任何錯誤絕不讓 auth.users 建立失敗）
-- 2. 確保 bubu_app_users.role 的 CHECK 允許所有角色
-- ════════════════════════════════════════════════════════════════════════════

-- 1. 確保 role 欄位允許所有需要的角色
DO $$
BEGIN
  -- 移除舊的 CHECK constraint（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'bubu_app_users' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.bubu_app_users DROP CONSTRAINT ' || quote_ident(constraint_name)
      FROM information_schema.table_constraints
      WHERE table_name = 'bubu_app_users' AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%role%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE public.bubu_app_users
  ADD CONSTRAINT bubu_app_users_role_check
  CHECK (role IN ('admin', 'manager', 'consultant', 'member'));

-- 2. 重新定義 defensive handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.bubu_app_users (id, role, display_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- trigger 絕不讓 auth.users 建立失敗
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. 確保 trigger 存在
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
