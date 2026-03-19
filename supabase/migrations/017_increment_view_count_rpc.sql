-- RPC function for atomic view_count increment
CREATE OR REPLACE FUNCTION increment_view_count(article_id UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE generated_articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id
  RETURNING view_count;
$$;
