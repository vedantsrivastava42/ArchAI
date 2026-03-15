-- Holistic overview stored after index-time multi-query + LLM (bullets only)
ALTER TABLE repos ADD COLUMN IF NOT EXISTS report JSONB;
