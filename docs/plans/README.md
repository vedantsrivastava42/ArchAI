# Codebase Knowledge AI V0 — Plan

Plans are split into numbered documents so you can implement in pieces instead of all at once.

## Overview

Build a greenfield monorepo for **Codebase Knowledge AI**: clone GitHub repos, parse code with Tree-sitter, embed with OpenAI, store in Qdrant, and chat via Claude. Single backend (Express) and Next.js frontend with Mantine. Postgres + Qdrant required; target 10–15 concurrent users.

## Plan documents

| Doc | Topic |
|-----|--------|
| [00-overview-and-architecture.md](00-overview-and-architecture.md) | Current state, high-level flow diagram, how pieces connect |
| [01-monorepo-and-tooling.md](01-monorepo-and-tooling.md) | Workspace structure, tooling, package layout |
| [02-docker-and-infrastructure.md](02-docker-and-infrastructure.md) | Postgres + Qdrant (Docker optional) |
| [03-database.md](03-database.md) | PostgreSQL schema, migrations |
| [04-backend.md](04-backend.md) | Express API, routes, services, errors |
| [05-packages.md](05-packages.md) | types, repo-parser, indexer, retriever, llm |
| [06-vector-db.md](06-vector-db.md) | Qdrant collection, payload, dimensions |
| [07-frontend.md](07-frontend.md) | Next.js pages, Mantine UI, chat |
| [08-repo-filtering-and-file-types.md](08-repo-filtering-and-file-types.md) | Ignore list, supported extensions |
| [09-error-handling.md](09-error-handling.md) | User-facing error cases and HTTP mapping |
| [10-implementation-order.md](10-implementation-order.md) | Suggested order to build (step-by-step) |
| [11-files-summary.md](11-files-summary.md) | List of files to create per area |
| [parallel-build-guide.md](parallel-build-guide.md) | Which work streams / plan docs can be built **in parallel** |
| [phase-2-v2-features.md](phase-2-v2-features.md) | **Phase 2** — V2 features (queue, more languages, persisted chat, streaming, auth) |

Start with **00** for context, then follow **10-implementation-order.md** and open the corresponding doc for each step. After V0 is solid, use **phase-2-v2-features.md** for the next iteration.
