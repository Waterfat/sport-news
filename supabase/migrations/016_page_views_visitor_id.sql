-- Add persistent visitor_id for more reliable UV tracking
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS idx_page_views_visitor ON page_views(visitor_id);
