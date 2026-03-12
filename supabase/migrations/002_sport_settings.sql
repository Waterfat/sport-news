-- 球種設定表
CREATE TABLE IF NOT EXISTS sport_settings (
  id SERIAL PRIMARY KEY,
  sport_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 預設資料：只啟用 basketball
INSERT INTO sport_settings (sport_key, enabled) VALUES
  ('basketball', true),
  ('baseball', false),
  ('football', false),
  ('soccer', false)
ON CONFLICT (sport_key) DO NOTHING;
