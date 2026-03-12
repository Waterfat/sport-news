-- 007: Article analytics, comments, likes, newsletter

-- Add view_count and slug to generated_articles
ALTER TABLE generated_articles
ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS slug text;

-- Create index on slug
CREATE INDEX IF NOT EXISTS idx_generated_articles_slug ON generated_articles(slug);
CREATE INDEX IF NOT EXISTS idx_generated_articles_view_count ON generated_articles(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_generated_articles_category ON generated_articles(category);

-- Article views detail table (for analytics)
CREATE TABLE IF NOT EXISTS article_views (
  id bigserial PRIMARY KEY,
  article_id uuid REFERENCES generated_articles(id) ON DELETE CASCADE,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_created_at ON article_views(created_at);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id bigserial PRIMARY KEY,
  article_id uuid REFERENCES generated_articles(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  content text NOT NULL,
  is_approved boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);

-- Article likes table
CREATE TABLE IF NOT EXISTS article_likes (
  id bigserial PRIMARY KEY,
  article_id uuid REFERENCES generated_articles(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(article_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_article_likes_article_id ON article_likes(article_id);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

-- Publish logs table (track publish attempts to channels)
CREATE TABLE IF NOT EXISTS publish_logs (
  id bigserial PRIMARY KEY,
  article_id uuid REFERENCES generated_articles(id) ON DELETE CASCADE,
  channel_id integer,
  status text NOT NULL DEFAULT 'pending', -- pending, success, failed
  external_post_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_logs_article_id ON publish_logs(article_id);

-- Auto-generate slug from title (function)
CREATE OR REPLACE FUNCTION generate_article_slug()
RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set slug
DROP TRIGGER IF EXISTS trg_generate_slug ON generated_articles;
CREATE TRIGGER trg_generate_slug
  BEFORE INSERT ON generated_articles
  FOR EACH ROW
  EXECUTE FUNCTION generate_article_slug();

-- Update existing articles to have slug = id where slug is null
UPDATE generated_articles SET slug = id::text WHERE slug IS NULL;
