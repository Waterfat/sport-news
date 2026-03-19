-- RPC: 回傳已發布文章的平均 content 字數（避免 API 載入全文）
CREATE OR REPLACE FUNCTION get_avg_content_length()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(ROUND(AVG(char_length(content)))::integer, 0)
  FROM generated_articles
  WHERE status = 'published';
$$;
