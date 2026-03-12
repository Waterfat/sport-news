-- 改寫任務佇列表
CREATE TABLE IF NOT EXISTS rewrite_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  articles_generated int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- 啟用 Realtime 讓 Mac Mini 監聽
ALTER PUBLICATION supabase_realtime ADD TABLE rewrite_tasks;
