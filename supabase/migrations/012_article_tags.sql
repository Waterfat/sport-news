-- Article tags system
CREATE TABLE IF NOT EXISTS article_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES generated_articles(id) ON DELETE CASCADE,
  tag_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_article_tags_article ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_name ON article_tags(tag_name);
