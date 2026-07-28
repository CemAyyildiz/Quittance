# Quittance

Invoice on Stellar. Get paid. Keep the proof.

Quittance helps freelancers create an invoice, accept payment via link or QR on Stellar, verify it on Horizon (memo + amount + destination), then **download or email payment proof**. Settlement stays on-chain. Quittance does not expose other people’s wallet identity or history.

**Sharp initial user:** freelancer invoicing a client in XLM/USDC on Stellar.

---

## What is shipped (v0.1 local / MVP)

| Capability | Status |
|------------|--------|
| Freighter wallet as identity (create + pay) | Done — no Google login gate |
| Create invoice + payment URL / QR | Done |
| Optional client email + Send invoice / Email proof (`mailto:`) | Done |
| Horizon-backed payment verify | Done (memo, amount, destination, asset) |
| Dashboard scoped to connected wallet | Done |
| Primary **Download Proof** CTA after paid | Done (PDF print flow in browser) |
| Simulate-payment UI | Removed from demo UI (`ALLOW_SIMULATE=true` only on API) |
| Public hosted demo + testnet evidence pack | Phase D (not yet) |
| Postgres persistence / SMTP / Gmail API | After demo (Phase E) |

Ship plan: [`PLAN.md`](./PLAN.md).

---

## How it works

1. Connect Freighter and create an invoice (optional client name/email)  
2. Share the payment URL or QR — or **Send invoice** if email is set  
3. Client pays on Stellar (Freighter, QR, or manual transfer with the memo)  
4. `POST /api/invoices/:id/verify` checks the tx on Horizon  
5. **Download Proof** (primary) or **Email Proof** (if client email exists)  

Identity is the **wallet**. Email is an **optional delivery channel**, not a login gate.

### Payment QR and copy behavior

On the invoice detail and pay pages, Quittance shows two labeled QR codes:

| Label | Payload | Use |
|-------|---------|-----|
| **Payment link** | HTTPS URL to `/pay/:id` | Browser checkout; copy/share this URL |
| **SEP-0007 wallet payment** | `web+stellar:pay?…` URI | Compatible Stellar wallets pre-fill pay fields |

Copy actions always place the URL or URI on the clipboard — never a PNG `data:` URL. The API also returns legacy `qrCode` / `stellarQrCode` image fields for older clients; the UI generates QR SVGs from `paymentUrl` and `stellarPaymentUri` instead.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind, Freighter |
| Backend (local / demo) | Express, TypeScript, **in-memory MVP** (`server-mvp.ts`) |
| Chain | Stellar testnet / public via Horizon |
| Later | PostgreSQL full server (not required for v0.1) |

---

## Requirements

- Node.js 18+
- [Freighter](https://www.freighter.app/) for wallet flows — see [Freighter docs](https://docs.freighter.app/)
- Stellar testnet account for real payments ([Laboratory](https://laboratory.stellar.org/#account-creator?network=test))

PostgreSQL and Redis are **not** required for the MVP path below.

---

## Quick start (MVP)

### Backend

```bash
cd backend
npm install
cp env.mvp.example .env
npm run dev:mvp
```

- API: `http://localhost:3001`  
- Health: `http://localhost:3001/api/health`  
- In-memory storage resets when the process restarts  

Optional: set `ALLOW_SIMULATE=true` in `.env` only for local fake payments (not for demos).

### Frontend

```bash
cd frontend
npm install
cp env.mvp.local .env.local
npm run dev
```

App: `http://localhost:3000`

### Frontend e2e tests

```bash
cd frontend
npx playwright install
npm run test:e2e
```

### Env reference

- Backend: `backend/env.mvp.example`  
- Frontend: `frontend/env.mvp.local` / `frontend/env.example.txt`  

Set `FRONTEND_URL` on the backend to match the frontend origin (CORS).

---

## Deploy frontend (Vercel)

Owner deploys the frontend (dashboard or CLI). Step-by-step: **[`deploy/vercel.md`](./deploy/vercel.md)**. CORS checklist: [`deploy/wire-cors.md`](./deploy/wire-cors.md).

1. Import the GitHub repo in [Vercel](https://vercel.com) (or `vercel` from `frontend/`).  
2. Set **Root Directory** to `frontend`.  
3. Framework preset: Next.js (see `frontend/vercel.json`).  
4. Add environment variables (Production):

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com/api` |
| `NEXT_PUBLIC_STELLAR_NETWORK` | `TESTNET` |
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` |
| `NEXT_PUBLIC_USE_MOCK` | `false` |

5. Deploy. Set VPS `FRONTEND_URL` to this Vercel origin (exact, no trailing slash), restart the API, confirm CORS.

Templates: `frontend/env.example.txt`, `frontend/env.mvp.local`.

---

## Deploy backend MVP (VPS)

Recommended host for `server-mvp.ts` (in-memory) is **your own VPS** (nginx + systemd). Do **not** use `backend/vercel.json` for the demo — that targets the Postgres full server.

Full runbook (clone, `.env`, systemd, nginx/TLS, CORS wire-up): **[`deploy/vps/README.md`](./deploy/vps/README.md)**.

Templates: [`deploy/vps/quittance-api.service`](./deploy/vps/quittance-api.service), [`deploy/vps/nginx-quittance-api.conf`](./deploy/vps/nginx-quittance-api.conf), [`backend/env.mvp.example`](./backend/env.mvp.example).

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (behind nginx) |
| `STELLAR_NETWORK` | `TESTNET` |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (exact frontend origin) |
| `ALLOW_SIMULATE` | `false` |

### After API is live

1. Public URL e.g. `https://api.yourdomain.com` must serve `GET /api/health`.  
2. Set frontend `NEXT_PUBLIC_API_URL` to `https://api.yourdomain.com/api` and redeploy Vercel.  
3. Confirm CORS: browser call from the Vercel origin to the API succeeds.

**Note:** In-memory means process restarts clear all invoices. Fine for a short demo; document this for reviewers.

Legacy [`backend/render.yaml`](./backend/render.yaml) is unused for this path.

---

## Demo & evidence

Reviewer pack: **[`EVIDENCE.md`](./EVIDENCE.md)** (URLs, testnet tx hashes, recording, tech note).

| Item | Status |
|------|--------|
| Public demo URL | Fill in `EVIDENCE.md` after deploy (D4) |
| Testnet tx hashes | Fill in after a real Freighter pay (D5) |
| Screen recording | Fill in after demo recording (D5) |

Until then, run locally: `backend` → `npm run dev:mvp`, `frontend` → `npm run dev`.

---

## Project layout

```
backend/     Express API — use server-mvp.ts for demo
frontend/    Next.js app
deploy/      Vercel handoff + VPS systemd/nginx + CORS checklist
db/          Postgres schema (post-demo)
PLAN.md      Product & delivery plan
ROADMAP.md   Short commit checklist
EVIDENCE.md  Public demo URL + testnet evidence (reviewer one-pager)
```

---

## License

MIT — see [`LICENSE`](./LICENSE).
