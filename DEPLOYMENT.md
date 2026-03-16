# Deployment: Frontend (Vercel) + Backend (EC2)

This doc covers running the **web app on Vercel** and the **API + worker on AWS EC2**.

---

## How it works (no localhost in production)

- **EC2**: Your API runs as a normal Node process. It listens on **0.0.0.0** (all interfaces), so it accepts requests from the **internet**, not only from “localhost” on that machine. EC2 has a **public IP** (and optionally a domain). You open that IP (or domain) in the security group so the world can hit `http://<EC2_PUBLIC_IP>:3001` (or your HTTPS URL).
- **Vercel**: The frontend is just the built Next.js app (HTML/JS). It’s **served by Vercel**, but the code runs in the **user’s browser**. When the app calls the API, the **browser** sends the request to the URL you set in `NEXT_PUBLIC_API_URL` — i.e. your EC2 public URL. So the request goes: **user’s browser → EC2**, not Vercel → EC2.

So in production nothing is “on localhost”: the server is reachable at its public URL, and the frontend uses that URL for all API calls.

---

## 0. Local testing (before deploy)

Test Redis (e.g. Upstash) and the add-repo flow locally:

1. **Redis**  
   In `.env` set `REDIS_URL` to your Upstash URL (`rediss://default:TOKEN@xxx.upstash.io:6379`). No local Redis install needed.

2. **Test Redis connection**
   ```bash
   npm run test:redis -w server
   ```
   You should see `Redis connection OK.`

3. **Run API and worker** (two terminals from repo root)
   ```bash
   npm run dev:server
   ```
   ```bash
   npm run worker:queue -w server
   ```

4. **Run the web app** (third terminal)
   ```bash
   npm run dev:web
   ```
   Open http://localhost:3000, add a new repo (GitHub URL). The worker should pick up the job and the repo should become "ready". If that works, deploy to EC2.

---

## 1. Backend on AWS EC2

### 1.1 One-time setup on the instance

- **OS**: Ubuntu 22.04 LTS (or any Linux with Node 20+).
- **Security group**: Allow inbound:
  - SSH (22) from your IP.
  - HTTP (80) and/or HTTPS (443) — or the port your API will use (e.g. 3001) if you’re not using a reverse proxy yet.
- **Install Node 20** (LTS):

  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```

- **Optional but recommended**: Install PM2 to run the server and worker:

  ```bash
  sudo npm install -g pm2
  ```

### 1.2 Clone and build (e.g. on branch `aws-deployed`)

```bash
cd /home/ubuntu  # or your preferred user dir
git clone --branch aws-deployed https://github.com/YOUR_ORG/ArchAI.git
cd ArchAI
```

### 1.3 Environment on EC2

Create a `.env` in the **repo root** (same as local). The server and worker both read `../../.env` from `apps/server`.

Required:

- `DATABASE_URL` — Postgres (e.g. Neon, Supabase).
- `REDIS_URL` — Redis (e.g. ElastiCache, Upstash, or a small Redis on same EC2).
- `QDRANT_URL` — Qdrant (e.g. Qdrant Cloud).
- `OPENAI_API_KEY` — OpenAI key.

For production:

- `CORS_ORIGIN` — Your Vercel frontend URL, e.g. `https://your-app.vercel.app`. No trailing slash. For multiple origins use comma-separated.
- `PORT` — Optional; default is 3001.

Example (replace with your values):

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
QDRANT_URL=https://xxx.cloud.qdrant.io
OPENAI_API_KEY=sk-...
CORS_ORIGIN=https://your-app.vercel.app
PORT=3001
```

### 1.4 Build and run

From repo root:

```bash
npm ci
npm run build -w server
```

Run API and worker with PM2 (recommended):

```bash
cd apps/server
pm2 start dist/index.js --name archai-api
pm2 start dist/worker-queue.js --name archai-worker
pm2 save
pm2 startup   # follow the command it prints so processes survive reboot
```

Or without PM2 (foreground, for quick tests):

```bash
node apps/server/dist/index.js &
node apps/server/dist/worker-queue.js &
```

### 1.5 Expose the API

- **Option A – Direct port**: Open port 3001 in the security group and use `http://<EC2_PUBLIC_IP>:3001` as the API URL. Prefer only for tests; use HTTPS in production.
- **Option B – HTTPS with Nginx**: Install Nginx, get a domain (or use the EC2 public DNS), obtain a cert (e.g. Let’s Encrypt with `certbot`), and reverse-proxy to `http://127.0.0.1:3001`. Then your API URL is `https://api.yourdomain.com`.

After this you should have a base URL like:

- `http://<EC2_IP>:3001`, or  
- `https://api.yourdomain.com`

Use that as `NEXT_PUBLIC_API_URL` in the frontend.

---

## 2. Frontend on Vercel

### 2.1 Connect repo

1. Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
2. **Add New Project** → Import the ArchAI repo.
3. Set **Root Directory** to `apps/web` (so Vercel detects Next.js).
4. Override **Install Command** so workspace dependencies install from the repo root:
   - **Install Command**: `cd ../.. && npm ci`
   - **Build Command**: leave default `next build`.

### 2.2 Environment variable

In the Vercel project: **Settings → Environment Variables** add:

| Name                   | Value                          | Environments   |
|------------------------|--------------------------------|----------------|
| `NEXT_PUBLIC_API_URL`  | `https://api.yourdomain.com` or `http://<EC2_IP>:3001` | Production (and Preview if you want) |

Redeploy after adding the variable so the frontend uses the correct API URL.

### 2.3 Deploy

Push to the branch you connected (e.g. `main` or `aws-deployed`). Vercel will build and deploy. Your app will call the EC2 backend using `NEXT_PUBLIC_API_URL`.

---

## 3. Summary

| Where   | What to set / run |
|--------|--------------------|
| **EC2** | `.env` with `DATABASE_URL`, `REDIS_URL`, `QDRANT_URL`, `OPENAI_API_KEY`, `CORS_ORIGIN=https://your-app.vercel.app`, optional `PORT`. Run `dist/index.js` (API) and `dist/worker-queue.js` (worker). Expose API on 3001 or via Nginx/HTTPS. |
| **Vercel** | Root = `apps/web`, Install = `cd ../.. && npm ci`. Env var `NEXT_PUBLIC_API_URL` = your EC2 API URL (HTTPS preferred). |

After both are set:

- **Backend** allows requests from the Vercel origin because of `CORS_ORIGIN`.
- **Frontend** sends all API requests to the EC2 API using `NEXT_PUBLIC_API_URL`.

For the `aws-deployed` branch: use the same steps; point Vercel at that branch if you want deployments only from that branch.
