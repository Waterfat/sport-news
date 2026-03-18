-- Add member_id to page_views for tracking logged-in users
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_page_views_member ON page_views(member_id) WHERE member_id IS NOT NULL;
