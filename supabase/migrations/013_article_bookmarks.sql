-- Article bookmarks / favorites system
CREATE TABLE IF NOT EXISTS article_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES generated_articles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_member ON article_bookmarks(member_id);
