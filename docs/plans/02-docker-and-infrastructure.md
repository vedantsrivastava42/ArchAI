# Infrastructure: Postgres + Qdrant

V0 requires **Postgres** (repo metadata) and **Qdrant** (vectors). No Redis.

## Option A: Hosted (no Docker)

- **Postgres**: Neon, Supabase, or similar. Set `DATABASE_URL`.
- **Qdrant**: Qdrant Cloud or run Qdrant binary locally. Set `QDRANT_URL`.

## Option B: Local via Docker

Optional `docker-compose.yml` at repo root:

| Service   | Image                 | Port  |
|----------|------------------------|-------|
| postgres | postgres:16-alpine     | 5432  |
| qdrant   | qdrant/qdrant:latest   | 6333  |

- Postgres: one database (e.g. `codebase_knowledge`); volume for persistence.
- Backend env: `DATABASE_URL`, `QDRANT_URL`.

We will proceed with Option A 