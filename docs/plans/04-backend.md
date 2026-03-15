# Backend (Express) — `apps/server`

## Entry

- `src/index.ts`: create Express app, attach routes, start server; load env (e.g. `dotenv`).

## Routes (REST, JSON)

| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/repos         | Body: `{ url: string }`. Validate GitHub URL; create repo row; run indexing inline. Return `{ repoId, status }`. |
| GET    | /api/repos/:id     | Return repo + status + `files_processed`. |
| GET    | /api/repos/:id/status | Lightweight status for polling (e.g. progress bar). |
| POST   | /api/repos/:id/chat | Body: `{ message: string, history?: Array<{ role, content }> }`. Run retrieval + LLM. Return `{ answer, references }`. |

## Services (delegated to packages)

| Service           | Responsibility | Location |
|-------------------|----------------|----------|
| RepoService       | Clone repo, list files, apply ignore list | `packages/repo-parser` + server glue |
| ParserService     | Tree-sitter parse; extract functions/classes per file | `packages/repo-parser` or `packages/indexer` |
| ChunkService      | Build chunk objects (id, repoId, filePath, language, symbolType, symbolName, content) | `packages/indexer` |
| EmbeddingService  | OpenAI `text-embedding-3-large` for chunks and query | `packages/indexer` + `packages/retriever` |
| VectorService     | Qdrant: create collection, upsert points, search with `repo_id` filter | `packages/retriever` or server |
| RetrievalService  | Embed query → vector search (top 5) → return chunks | `packages/retriever` |
| LLMService        | Build prompt, call Claude, return answer + refs | `packages/llm` |

## Error handling

- Central Express error middleware; map to HTTP status (400 invalid URL, 404 repo not found, 502 clone/API errors).
- Handle: “repo too large”, “private repo”, “clone failure”, “unsupported file” with clear messages. See [09-error-handling.md](09-error-handling.md).
