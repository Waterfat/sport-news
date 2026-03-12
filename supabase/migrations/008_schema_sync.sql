-- 008_schema_sync.sql
-- Comprehensive schema sync: add missing tables, columns, and indexes
-- Uses IF NOT EXISTS patterns for idempotent execution

-- ============================================================
-- A. Missing tables
-- ============================================================

-- 改寫任務
CREATE TABLE IF NOT EXISTS rewrite_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 改寫計畫
CREATE TABLE IF NOT EXISTS rewrite_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_article_ids UUID[] DEFAULT '{}',
  writer_persona_id UUID REFERENCES writer_personas(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 電子報訂閱者
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章按讚
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES generated_articles(id) ON DELETE CASCADE,
  ip_hash VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, ip_hash)
);

-- 文章瀏覽紀錄
CREATE TABLE IF NOT EXISTS article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES generated_articles(id) ON DELETE CASCADE,
  ip_hash VARCHAR(16),
  user_agent VARCHAR(500),
  referrer VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- B. Missing columns on existing tables
-- ============================================================

-- generated_articles: slug, view_count, category
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS slug VARCHAR(500);
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- writer_personas: specialties, writer_type, max_articles
ALTER TABLE writer_personas ADD COLUMN IF NOT EXISTS specialties JSONB DEFAULT '{}';
ALTER TABLE writer_personas ADD COLUMN IF NOT EXISTS writer_type VARCHAR(50) DEFAULT 'columnist';
ALTER TABLE writer_personas ADD COLUMN IF NOT EXISTS max_articles INTEGER DEFAULT 2;

-- rewrite_tasks: metadata (in case table already existed without it)
ALTER TABLE rewrite_tasks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================================
-- C. Missing indexes
-- ============================================================

-- generated_articles
CREATE INDEX IF NOT EXISTS idx_generated_articles_status_published
  ON generated_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_articles_category
  ON generated_articles(category);
CREATE INDEX IF NOT EXISTS idx_generated_articles_writer_persona_id
  ON generated_articles(writer_persona_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_articles_slug
  ON generated_articles(slug) WHERE slug IS NOT NULL;

-- raw_articles: composite index for unprocessed article queries
CREATE INDEX IF NOT EXISTS idx_raw_articles_unprocessed
  ON raw_articles(is_processed, crawled_at DESC);

-- article_likes
CREATE INDEX IF NOT EXISTS idx_article_likes_article_id
  ON article_likes(article_id);

-- article_views
CREATE INDEX IF NOT EXISTS idx_article_views_article_id
  ON article_views(article_id);

-- publish_channels
CREATE INDEX IF NOT EXISTS idx_publish_channels_is_active
  ON publish_channels(is_active);

-- crawl_sources
CREATE INDEX IF NOT EXISTS idx_crawl_sources_is_active
  ON crawl_sources(is_active);

-- rewrite_plans
CREATE INDEX IF NOT EXISTS idx_rewrite_plans_created_at
  ON rewrite_plans(created_at DESC);

-- ============================================================
-- D. Notes
-- ============================================================
-- * publish_logs table exists (001_initial_schema) but is unused in code.
-- * comments table may need a migration if re-enabled in the frontend.
