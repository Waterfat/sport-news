-- 新增 tags 欄位：儲存文章自動標註的球隊/球員/聯盟標籤
ALTER TABLE generated_articles ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 建立 GIN index 加速標籤查詢
CREATE INDEX IF NOT EXISTS idx_generated_articles_tags ON generated_articles USING GIN (tags);
