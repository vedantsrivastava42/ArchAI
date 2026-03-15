# Implementation order

1. **Monorepo** — Root package.json, workspaces. See [01-monorepo-and-tooling.md](01-monorepo-and-tooling.md).

2. **packages/types** — Chunk, Repo, API types. See [05-packages.md](05-packages.md#51-packagestypes).

3. **packages/repo-parser** — Clone, list files, filter. See [05-packages.md](05-packages.md#52-packagesrepo-parser), [08-repo-filtering-and-file-types.md](08-repo-filtering-and-file-types.md).

4. **packages/indexer** — Tree-sitter (TypeScript/JS first), chunk, embed, Qdrant upsert. See [05-packages.md](05-packages.md#53-packagesindexer), [06-vector-db.md](06-vector-db.md).

5. **apps/server** — Express, DB (repos table), POST repos, GET status; run repo-parser + indexer inline. See [03-database.md](03-database.md), [04-backend.md](04-backend.md).

6. **packages/retriever** — Embed query, vector search by repo_id. See [05-packages.md](05-packages.md#54-packagesretriever).

7. **packages/llm** — Prompt + Claude. See [05-packages.md](05-packages.md#55-packagesllm).

8. **Chat API** — POST repos/:id/chat (retriever + llm). See [04-backend.md](04-backend.md).

9. **apps/web** — Next.js, Mantine, Home + Dashboard + Chat. See [07-frontend.md](07-frontend.md).

10. **Error handling and polish** — Limits, messages, code blocks, file refs. See [09-error-handling.md](09-error-handling.md).

Minimal path: 1 → 2 → 3 → 4 → 5 (indexing), then 6 → 7 → 8 (chat), then 9 → 10 (UI + polish).
