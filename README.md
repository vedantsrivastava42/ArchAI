# ArchAI

Codebase analysis with AI: index a GitHub repo, then chat over it with retrieval + OpenAI (embeddings + chat).

Built from [docs/plans](docs/plans): overview (00) through files summary (11).

## Stack

- **Monorepo**: npm workspaces (or pnpm via `pnpm-workspace.yaml`)
- **Backend**: Express, Postgres (repo metadata), Qdrant (vectors)
- **Frontend**: Next.js 14 (App Router), Mantine, TanStack Query
- **Packages**: `@archai/types`, `repo-parser`, `indexer`, `retriever`, `llm`

## Setup

1. **Env**  
   Copy `.env.example` to `.env` and set:
   - `DATABASE_URL`, `QDRANT_URL` (see **No Docker** below)
   - `OPENAI_API_KEY` (used for embeddings and chat)  
   Optional: `GITHUB_TOKEN` for private repos, `PORT` for server (default 3001).

2. **No Docker (recommended)** — use hosted services:
   - **Postgres**: Sign up at [Neon](https://neon.tech) or [Supabase](https://supabase.com) (free tiers). Create a project and copy the connection string → set as `DATABASE_URL` (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
   - **Qdrant**: Either:
     - **Qdrant Cloud**: Sign up at [cloud.qdrant.io](https://cloud.qdrant.io), create a cluster, copy the cluster URL → set as `QDRANT_URL` (and `QDRANT_API_KEY` if required), or
     - **Qdrant locally**: Download the [Qdrant binary](https://github.com/qdrant/qdrant/releases), run it (e.g. `./qdrant`), then set `QDRANT_URL=http://localhost:6333`.
   No Docker needed.

3. **Install & build**  
   From repo root:
   - `npm install`
   - Build packages (order matters):  
     `npm run build -w @archai/types` then build `repo-parser`, `indexer`, `retriever`, `llm`, then `server` and `web`.

   Or build all: `npm run build` (if your root script runs workspaces in order).

4. **Run**  
   - API: `npm run dev:server` (Express on PORT)
   - Web: `npm run dev:web` (Next.js on 3000)  
   Set `NEXT_PUBLIC_API_URL=http://localhost:3001` if the API is on another host.

## Run & test

**If indexing fails with "fetch failed" or connection refused:** Qdrant must be running. From this repo we install Qdrant into `bin/` — in a **separate terminal** run:
  ```bash
  npm run qdrant
  ```
  Keep it running; then start the API and web app. Alternatively use [Qdrant Cloud](https://cloud.qdrant.io) and set `QDRANT_URL` to your cluster URL.

1. **Create `.env`** (copy from `.env.example`) and set at least:
   - `DATABASE_URL` — from Neon/Supabase or your Postgres host
   - `QDRANT_URL` — from Qdrant Cloud or `http://localhost:6333` if running Qdrant locally
   - `OPENAI_API_KEY` — used for embeddings and chat (no other API keys needed)

2. **Install and build** (from repo root):
   ```bash
   npm install
   npm run build -w @archai/types
   npm run build -w @archai/repo-parser
   npm run build -w @archai/indexer
   npm run build -w @archai/retriever
   npm run build -w @archai/llm
   npm run build -w server
   npm run build -w web
   ```

3. **Run backend and frontend** (two terminals):
   ```bash
   # Terminal 1 – API (default port 3001)
   npm run dev:server

   # Terminal 2 – Next.js (port 3000)
   npm run dev:web
   ```

4. **Test in the browser**:
   - Open **http://localhost:3000**
   - Paste a **public** GitHub repo URL (e.g. `https://github.com/vercel/next.js`) and click **Analyze**
   - You’re redirected to the repo page; wait until status is **ready** (progress/status updates automatically)
   - Open the **Chat** tab and ask something like “Where is the main App component defined?” or “How does routing work?”
   - Answers should reference files and code from the repo.

If the web app runs on a different host than the API, set `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env` (or in the shell before `npm run dev:web`).

## Checking Qdrant storage

- **Local Qdrant (binary)**  
  When you run `npm run qdrant` from the repo root, Qdrant uses the default data directory `./qdrant_storage`. To see how much disk it uses:
  ```bash
  du -sh qdrant_storage
  ```
  Or use the script: `npm run qdrant:storage` (same thing, from repo root).

- **Via API**  
  With Qdrant running, you can inspect collections and telemetry:
  - List collections: `curl -s "${QDRANT_URL:-http://localhost:6333}/collections" | jq`
  - Collection details (points count, segments): `curl -s "${QDRANT_URL:-http://localhost:6333}/collections/codebase_chunks" | jq`
  - Cluster telemetry (resource usage): `curl -s "${QDRANT_URL:-http://localhost:6333}/cluster/telemetry" | jq`

  For Qdrant Cloud, replace the URL with your cluster URL and add auth if required.

## Usage

1. Open the web app, paste a **public** GitHub repo URL, click **Analyze**.
2. Wait for indexing (status on the repo page).
3. When status is **ready**, use the **Chat** tab to ask questions; answers use retrieved code and file references.

## Plan checklist (11-files-summary)

Root, `apps/server`, `apps/web`, and all `packages/*` files from the summary are in place. Error handling: central middleware in `apps/server/src/middleware/errors.ts` (Plan 09).
