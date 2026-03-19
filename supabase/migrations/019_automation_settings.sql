-- 019: 自動/手動模式設定表（Issue #76）
-- 單行設定模式，id = 1 固定

CREATE TABLE IF NOT EXISTS automation_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_auto_mode BOOLEAN NOT NULL DEFAULT false,
  article_threshold INT NOT NULL DEFAULT 5,
  check_interval_minutes INT NOT NULL DEFAULT 30,
  last_check_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT CHECK (last_run_status IN ('success', 'failed', 'running')),
  last_run_error TEXT,
  last_run_articles_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 插入預設行（手動模式）
INSERT INTO automation_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- RLS: 只有 authenticated 用戶可讀寫（後台用）
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read" ON automation_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated update" ON automation_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- service_role 完整存取（cron endpoint 用）
CREATE POLICY IF NOT EXISTS "Allow service_role all" ON automation_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
