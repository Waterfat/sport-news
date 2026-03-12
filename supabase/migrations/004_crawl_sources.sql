-- 爬蟲來源管理表
CREATE TABLE IF NOT EXISTS crawl_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 預設來源
INSERT INTO crawl_sources (name, base_url) VALUES
  ('ESPN', 'https://www.espn.com'),
  ('Yahoo Sports', 'https://sports.yahoo.com'),
  ('ETtoday 體育', 'https://sports.ettoday.net')
ON CONFLICT (name) DO NOTHING;
