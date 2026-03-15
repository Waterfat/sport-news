-- 即時比分設定表
CREATE TABLE IF NOT EXISTS scoreboard_configs (
  id SERIAL PRIMARY KEY,
  sport_key TEXT NOT NULL,
  league_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  espn_endpoint TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO scoreboard_configs (sport_key, league_key, label, espn_endpoint, enabled, sort_order) VALUES
  ('basketball', 'nba', 'NBA', 'basketball/nba', true, 1),
  ('baseball', 'mlb', 'MLB', 'baseball/mlb', true, 2),
  ('soccer', 'epl', '英超', 'soccer/eng.1', false, 3),
  ('soccer', 'laliga', '西甲', 'soccer/esp.1', false, 4),
  ('soccer', 'ucl', '歐冠', 'soccer/uefa.champions', false, 5)
ON CONFLICT (league_key) DO NOTHING;
