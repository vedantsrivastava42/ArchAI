# Files to create (summary)

Use this as a checklist. Details are in the linked plan docs.

## Root

- `package.json`
- `pnpm-workspace.yaml` (or npm workspaces)
- `tsconfig.json`
- `.env.example`
- `docker-compose.yml` (optional; see [02-docker-and-infrastructure.md](02-docker-and-infrastructure.md))

## apps/server

- `src/index.ts`
- `src/routes/repos.ts`
- `src/routes/chat.ts`
- `src/services/` (or thin wrappers to packages)
- `src/db.ts`
- `migrations/` (e.g. initial schema)
- `package.json`

## apps/web

- `app/page.tsx`
- `app/repos/[id]/page.tsx`
- `app/layout.tsx`
- Components: RepoForm, Chat, MessageBubble, CodeBlock (or equivalent)
- `package.json`
- MantineProvider setup

## packages/types

- `index.ts`
- `chunk.ts`
- `repo.ts`
- `api.ts`
- `package.json`

## packages/repo-parser

- `index.ts`
- `clone.ts`
- `walk.ts`
- `filter.ts`
- `package.json`

## packages/indexer

- `index.ts`
- `parse.ts` (tree-sitter)
- `chunk.ts`
- `embed.ts`
- `vector.ts`
- `package.json`

## packages/retriever

- `index.ts`
- `search.ts`
- `package.json`

## packages/llm

- `index.ts`
- `prompt.ts`
- `claude.ts`
- `package.json`

---

One backend process. Keep functions small, async, and modules focused.
