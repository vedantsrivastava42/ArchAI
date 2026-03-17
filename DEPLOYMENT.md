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

### ngrok on EC2 (HTTPS for Vercel, no Nginx)

So the Vercel frontend (HTTPS) can call your API without mixed-content blocking:

1. **Install** (e.g. Amazon Linux):  
   `curl -sO https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz && tar xzf ngrok-v3-stable-linux-amd64.tgz && sudo mv ngrok /usr/local/bin/`
2. **Auth**: Sign up at [ngrok.com](https://ngrok.com), copy your authtoken from the dashboard, then on EC2:  
   `ngrok config add-authtoken YOUR_TOKEN`
3. **Run** (on EC2, same machine as the API):  
   `ngrok http 3001`  
   Copy the **HTTPS** URL (e.g. `https://xxx.ngrok-free.dev`). Keep the terminal running (or use `screen`/`tmux`).
4. **Vercel**: Set `NEXT_PUBLIC_API_URL` to that HTTPS URL and redeploy. **EC2 `.env`**: Set `CORS_ORIGIN` to your Vercel origin (e.g. `https://your-app.vercel.app`), then `pm2 restart archai-api`.

Free-tier ngrok URL can change when you restart ngrok; update Vercel env and redeploy if it does.

---

## 2. Frontend (Vercel)

- **Root directory**: `apps/web`.
- **Install**: `cd ../.. && npm ci`.
- **Build**: leave default `npm run build` (it builds `@archai/types` then Next.js automatically).
- **Node**: `apps/web` has `engines.node: "20.x"` so Vercel uses Node 20 (avoids native addon build failures).
- **Env**: `NEXT_PUBLIC_API_URL` = **HTTPS** URL to your API. Vercel is HTTPS, so the API must be reachable over HTTPS or the browser blocks requests (mixed content). Use either:
  - **ngrok** (simplest): run ngrok on EC2 (see below), use the `https://xxx.ngrok-free.dev` URL.
  - Or Nginx + domain + SSL (e.g. `https://api.yourdomain.com`).

Redeploy after changing env so the client gets the new API URL. The app uses `apiFetch` (adds `ngrok-skip-browser-warning` when calling the API) so ngrok free tier skips the interstitial.

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

---

## 5. Local testing (before deploy)

- **Backend**: `.env` in repo root (same as EC2). From repo root: `npm run dev:server` (API on 3001), and in another terminal `npm run worker:queue -w server`.
- **Frontend**: In `apps/web/.env.local` set `NEXT_PUBLIC_API_URL=http://localhost:3001` so the app talks to your local API. Then from repo root: `npm run dev:4000 -w web` (or from `apps/web`: `npm run dev:4000`). Open **http://localhost:4000**.
- To test against a remote API (e.g. EC2 via ngrok), set `NEXT_PUBLIC_API_URL` to that URL in `.env.local` and run the same commands.

