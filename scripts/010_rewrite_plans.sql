-- 寫手產出文章數量上限
ALTER TABLE writer_personas ADD COLUMN IF NOT EXISTS max_articles integer DEFAULT 2;

-- 改寫規劃表
CREATE TABLE IF NOT EXISTS rewrite_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_persona_id uuid REFERENCES writer_personas(id) ON DELETE CASCADE,
  title text NOT NULL,
  raw_article_ids uuid[] DEFAULT '{}',
  league text,
  plan_type text NOT NULL DEFAULT 'columnist' CHECK (plan_type IN ('columnist', 'official')),
  created_at timestamptz NOT NULL DEFAULT now()
);
