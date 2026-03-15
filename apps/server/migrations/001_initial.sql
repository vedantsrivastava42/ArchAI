-- Plan 03: repos table (repo metadata only; vectors in Qdrant)
CREATE TABLE IF NOT EXISTS repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_url TEXT NOT NULL,
  name TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'indexing', 'ready', 'failed')),
  error_message TEXT,
  files_processed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repos_status ON repos (status);
CREATE INDEX IF NOT EXISTS idx_repos_created_at ON repos (created_at DESC);
