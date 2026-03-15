# Monorepo and tooling

## Tooling

- **Package manager**: pnpm workspaces (or npm workspaces).
- **Root**: `package.json` and `pnpm-workspace.yaml` defining `apps/*` and `packages/*`.
- **Root config**: TypeScript base config; ESLint; Prettier.

## Structure

```
/
├── apps/
│   ├── web/          # Next.js 14+ (App Router), TypeScript, Mantine, TanStack Query
│   └── server/       # Express, TypeScript
├── packages/
│   ├── types/        # Shared TS types (chunks, repo, API contracts)
│   ├── repo-parser/  # Clone + file tree + ignore rules
│   ├── indexer/      # Parse → chunks → embed → vector (orchestration)
│   ├── retriever/    # Embed query → vector search → top-k chunks
│   └── llm/          # Prompt build + Claude API
├── package.json
└── pnpm-workspace.yaml
```

## Packages

- Each package has its own `package.json` and `tsconfig.json`.
- `packages/types` is consumed by `server`, `indexer`, `retriever`, `llm`, and optionally `web` for type-safe API types.
