-- Add title_prompt column for AI title style guidance per sport
ALTER TABLE sport_settings ADD COLUMN IF NOT EXISTS title_prompt TEXT DEFAULT '';
