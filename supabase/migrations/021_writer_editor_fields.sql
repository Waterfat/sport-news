-- Migration 021: 新增寫手+總編輯相關欄位 (Issue #141)
-- 在 generated_articles 表新增：review_status, review_result, reviewed_at, writing_strategy, cited_sources

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS review_result jsonb DEFAULT NULL;

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz DEFAULT NULL;

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS writing_strategy text DEFAULT NULL
    CHECK (writing_strategy IS NULL OR writing_strategy IN ('multi_source', 'enriched', 'popular_digest'));

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS cited_sources jsonb DEFAULT '[]'::jsonb;

-- Index: 按 review_status 篩選（總編輯待審、已通過、已拒絕）
CREATE INDEX IF NOT EXISTS idx_generated_articles_review_status
  ON generated_articles(review_status);

-- Index: 按 writing_strategy 統計分析
CREATE INDEX IF NOT EXISTS idx_generated_articles_writing_strategy
  ON generated_articles(writing_strategy)
  WHERE writing_strategy IS NOT NULL;
