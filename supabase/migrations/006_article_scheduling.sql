-- 文章排程發布功能
-- 新增排程時間與發布頻道欄位

ALTER TABLE generated_articles
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_channel_ids INTEGER[] DEFAULT '{}';

-- 索引：加速排程任務查詢
CREATE INDEX IF NOT EXISTS idx_generated_articles_scheduled_at
  ON generated_articles(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'approved';
