-- 發布頻道管理
CREATE TABLE IF NOT EXISTS publish_channels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'facebook', 'telegram', 'x_twitter', 'line', 'custom'
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
