# Database (PostgreSQL)

Store repo metadata only. Vector data lives in Qdrant.

## Table: repos

- `id` (UUID, PK)
- `github_url`
- `name`
- `default_branch`
- `status` — `pending` | `indexing` | `ready` | `failed`
- `error_message`
- `files_processed`
- `created_at`, `updated_at`

## Migrations

- Simple migration runner or manual SQL under `apps/server/migrations`.
- No ORM for V0; `pg` client is enough.
