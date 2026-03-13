-- 爬蟲來源：是否爬取文章圖片
ALTER TABLE crawl_sources ADD COLUMN IF NOT EXISTS crawl_images boolean DEFAULT true NOT NULL;
