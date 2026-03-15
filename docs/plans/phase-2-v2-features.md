# Phase 2 — V2 features

Phase 2 builds on V0. Focus: scale beyond 10–15 users, background jobs, more languages, persisted chat, and optional auth.

---

## Infrastructure

| Feature | Description |
|--------|-------------|
| **Redis + BullMQ** | Job queue for indexing. `POST /api/repos` enqueues; worker process runs clone → parse → embed → vector. Avoids long-lived HTTP requests and timeouts. |
| **Docker recommended** | Provide `docker-compose.yml` with Postgres + Redis + Qdrant for local and staging. |
| **Environments** | Clear staging vs production config; env-based feature flags if needed. |

---

## Database

| Feature | Description |
|--------|-------------|
| **chat_sessions** | Table: `id`, `repo_id`, `created_at`. One session per repo (or per user-repo later). |
| **messages** | Table: `id`, `session_id`, `role`, `content`, `created_at`. Persist chat history; support “load previous conversation.” |

---

## Backend

| Feature | Description |
|--------|-------------|
| **Queue worker** | Separate process or script that runs BullMQ worker for `index-repo` jobs; updates repo status and `files_processed`. |
| **Private repos** | Support `GITHUB_TOKEN` in repo-parser clone step; document in .env.example. |
| **Streaming responses** | LLM: stream tokens; endpoint SSE or chunked response. Chat UI can show typing effect. |
| **Rate limiting** | Per-IP or per-user limits on POST /api/repos and POST /api/repos/:id/chat to protect APIs and costs. |

---

## Indexer / Parsers

| Feature | Description |
|--------|-------------|
| **Python** | Add `tree-sitter-python`; extract functions and classes. |
| **Go** | Add `tree-sitter-go`; same. |
| **Java** | Add `tree-sitter-java`; same. |
| **Filter** | Ensure repo-parser allowlist includes `.py`, `.go`, `.java` (already in [08-repo-filtering-and-file-types.md](08-repo-filtering-and-file-types.md)); wire to indexer. |

---

## Frontend

| Feature | Description |
|--------|-------------|
| **Persisted chat** | Load messages by session; “Continue conversation” from dashboard. |
| **Streaming UI** | Show LLM response as it streams (Mantine `Text` or similar updating in place). |
| **Multiple sessions** | List of chat sessions per repo; switch or create new. Optional for V2. |
| **Repo list** | Page or nav listing user’s repos (from `repos` table) with status and link to dashboard. |

---

## Optional (later)

- **Auth** — Sign-in (e.g. NextAuth, Clerk); associate repos and sessions with a user.
- **Multi-tenancy** — Scope repos and Qdrant collections by user/org.
- **API keys** — Allow programmatic access to chat or indexing APIs with key-based auth.

---

## Implementation order (suggested)

1. Redis + BullMQ + worker; move indexing off inline request.
2. chat_sessions + messages tables and APIs; persist and load chat.
3. Streaming LLM + streaming UI.
4. Add Python, Go, Java parsers in indexer.
5. Private repo support (GITHUB_TOKEN).
6. Rate limiting; Docker Compose; repo list UI.
7. Auth and API keys if needed.
