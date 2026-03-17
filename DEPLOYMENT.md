# Deployment: Frontend (Vercel) + Backend (EC2)

Brief reference for deploying this stack and what to do on backend changes.

---

## Architecture

- **Frontend**: Next.js on Vercel. All API calls use `NEXT_PUBLIC_API_URL` (set in Vercel env).
- **Backend**: Node API + worker on EC2. API listens on `0.0.0.0:3001`. Worker uses Redis (BullMQ) and Qdrant.

---

## 1. Backend (EC2)

### One-time setup

- **Security group**: SSH (22), TCP 3001 (or 80/443 if using Nginx).
- **Node 20**: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -` then `sudo apt-get install -y nodejs`.
- **PM2**: `sudo npm install -g pm2` (for API + worker + optional Qdrant).

### Clone and env

```bash
cd ~
git clone <repo-url> ArchAI && cd ArchAI
```

Create `.env` in **repo root**:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Postgres. On EC2 (no IPv6): use **transaction pooler** URL (e.g. Supabase pooler) so it’s IPv4. |
| `REDIS_URL` | Required. Use Upstash: `rediss://default:TOKEN@xxx.upstash.io:6379` (TLS + auth supported). |
| `QDRANT_URL` | `http://localhost:6333` if Qdrant runs on EC2; or Qdrant Cloud URL. |
| `OPENAI_API_KEY` | Your OpenAI key. |
| `CORS_ORIGIN` | Vercel app URL, e.g. `https://your-app.vercel.app` (comma-separated for multiple). |
| `PORT` | Optional; default 3001. |

### Build

From repo root (monorepo): build packages then server.

```bash
npm ci
npm run build -w @archai/types
# any other workspace packages the server depends on
npm run build -w server
```

Or from root: `npm run build` if your root script builds in the right order.

### Run API and worker (PM2)

```bash
cd apps/server
pm2 start dist/index.js --name archai-api
pm2 start dist/worker-queue.js --name archai-worker
pm2 save
pm2 startup   # run the command it prints for reboot persistence
```

Restart later: `pm2 restart archai-api` and `pm2 restart archai-worker`.

### Qdrant on EC2 (optional, no Docker)

If you run Qdrant on the same EC2 (e.g. aarch64):

1. **Download** (aarch64 Linux — use musl; no `-gnu` build for ARM):
   ```bash
   cd /tmp
   wget https://github.com/qdrant/qdrant/releases/download/v1.17.0/qdrant-aarch64-unknown-linux-musl.tar.gz
   tar xzf qdrant-aarch64-unknown-linux-musl.tar.gz
   sudo mv qdrant /usr/local/bin/
   ```
2. **Persistent data dir** (not `/tmp` — tmpfs loses data on reboot):
   ```bash
   mkdir -p ~/qdrant-data
   ```
3. **Run with PM2**:
   ```bash
   pm2 start /usr/local/bin/qdrant --name qdrant --cwd $HOME/qdrant-data
   pm2 save
   ```
4. In backend `.env`: `QDRANT_URL=http://localhost:6333`.

---

## 2. Frontend (Vercel)

- **Root directory**: `apps/web`.
- **Install**: `cd ../.. && npm ci`.
- **Build**: override with `npm run build:vercel` (builds `@archai/types` then Next.js; required because the app depends on that workspace package).
- **Env**: `NEXT_PUBLIC_API_URL` = EC2 API URL (e.g. `http://<EC2_IP>:3001` or `https://api.yourdomain.com`).

Redeploy after changing env so the client gets the new API URL.

---

## 3. When you change the backend (BE changes)

On EC2, from the repo root:

1. Pull latest: `git pull` (or deploy from your CI if you use it).
2. Install and build:
   ```bash
   npm ci
   npm run build -w @archai/types
   npm run build -w server
   ```
3. Restart API and worker:
   ```bash
   pm2 restart archai-api
   pm2 restart archai-worker
   ```
4. Optional: `pm2 logs archai-api` or `pm2 logs archai-worker` to confirm no startup errors.

No frontend redeploy needed unless you changed API contract or env (e.g. `NEXT_PUBLIC_*`).

---

## 4. Quick reference

| Component | Where | Command / URL |
|-----------|--------|----------------|
| API | EC2 | `pm2 start dist/index.js --name archai-api` (from `apps/server`) |
| Worker | EC2 | `pm2 start dist/worker-queue.js --name archai-worker` |
| Qdrant (on EC2) | EC2 | `pm2 start /usr/local/bin/qdrant --name qdrant --cwd $HOME/qdrant-data` |
| Frontend | Vercel | Root `apps/web`, env `NEXT_PUBLIC_API_URL` |
| After BE change | EC2 | `git pull` → `npm ci` → build server → `pm2 restart archai-api archai-worker` |

