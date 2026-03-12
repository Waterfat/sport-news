-- 為 sport_settings 加入 sources 欄位（每個球種可設定要爬哪些網站）
ALTER TABLE sport_settings
ADD COLUMN IF NOT EXISTS sources text[] DEFAULT ARRAY['ESPN', 'Yahoo Sports', 'ETtoday 體育'];
