# Quittance — Demo & Testnet Evidence

Reviewer one-pager for SCF / Level 4 style reviews.

Repo: https://github.com/CemAyyildiz/Quittance  

Deploy handoff: [`deploy/vercel.md`](./deploy/vercel.md) · [`deploy/vps/README.md`](./deploy/vps/README.md) · [`deploy/wire-cors.md`](./deploy/wire-cors.md)

---

## Public demo

| Item | Value |
|------|--------|
| Frontend | https://quittance-eosin.vercel.app |
| API health | https://insertion-followed-agencies-rejected.trycloudflare.com/api/health |
| API (direct VPS, HTTP) | http://169.58.11.59:3001/api/health |
| Feedback | https://quittance-eosin.vercel.app/feedback |
| Network | Stellar **TESTNET** |
| Analytics | Vercel Analytics (`@vercel/analytics` on the Next.js app) |

**How to try (≤ 3 min)**

1. Open the frontend URL  
2. Connect Freighter (Testnet) and fund the account if needed  
3. Create an invoice → copy payment link  
4. Pay with Freighter on `/pay/[id]`  
5. Confirm **PAID** → **Download Proof**  
6. Optional: leave feedback at `/feedback`  

**Limits:** MVP API is in-memory on the VPS (`/opt/quittance`, systemd `quittance-api`). Process restarts clear invoices. HTTPS for the browser uses a Cloudflare quick tunnel (`quittance-tunnel`); if that unit restarts, the `*.trycloudflare.com` hostname changes — update `frontend/.env.production` and redeploy Vercel.

---

## GrantFox — official links

1. https://github.com/CemAyyildiz/Quittance  
2. https://quittance-eosin.vercel.app  
3. https://insertion-followed-agencies-rejected.trycloudflare.com/api/health

---

## Testnet transactions (wallet interaction proof)

| # | Amount | Asset | Memo | Tx hash | Explorer |
|---|--------|-------|------|---------|----------|
| 1 | _TBD_ | XLM | _TBD_ | `_paste 64-char hash_` | [link](https://stellar.expert/explorer/testnet/tx/_hash_) |
| 2–10+ | _TBD_ | XLM | _TBD_ | `_additional Freighter pays for 10+ users_` | |

After a successful pay, copy the hash from the receipt or Freighter history. Level 4 needs **proof of 10+ real wallet interactions** — collect explorer links here.

---

## Smart contracts

| Item | Value |
|------|--------|
| Source | [`contracts/`](./contracts/) Cargo workspace (Soroban helper + contract crates) |
| Testnet deploy address | `_TBD — no instance deployed yet; paste `C…` after `stellar contract deploy`_` |
| Notes | Crates are library / contract modules under CI (`make test`). Production invoice verify today uses **Horizon** (`POST /api/invoices/:id/verify`). On-chain deploy is required before claiming a contract address on the submission form. |

---

## Screen recording

| Item | Value |
|------|--------|
| File / link | `_TBD — Loom, Drive, or repo release asset_` |
| Length | Target ≤ 3 minutes |
| Script | Create → share/pay → verify → Download Proof → dashboard → feedback |

---

## User feedback summary

Collect via `/feedback` (GitHub issue or `NEXT_PUBLIC_FEEDBACK_EMAIL`). Summarize after ≥10 users:

| Theme | Count | Notes |
|-------|-------|-------|
| _TBD_ | | |

Screenshots for submission: product UI, mobile layout, Vercel Analytics dashboard — attach to the review pack / grant form (not committed as binaries unless needed).

---

## Tech note (short)

- **Product:** Freelancer invoice → Stellar pay → payment proof (quittance)  
- **Identity:** Freighter wallet only (no Google login gate)  
- **Email:** Optional delivery (`mailto:` for Send invoice / Email proof)  
- **Verify:** `POST /api/invoices/:id/verify` loads the tx from Horizon and checks memo, amount, destination, and asset  
- **Seller model:** Each invoice stores the creator’s `sellerPublicKey` (dynamic wallet)  
- **Storage (demo):** In-memory MVP (`npm run start:mvp` on VPS) — not Postgres yet  
- **Hosts:** Frontend on Vercel; API self-hosted (nginx + systemd)  
- **Proof:** Browser PDF (“Download Proof”) + optional email  
- **Analytics / feedback:** Vercel Analytics + `/feedback`  

Ship plan: [`PLAN.md`](./PLAN.md).

---

## Checklist before SCF / Level 4 submission

- [x] Frontend URL filled and reachable  
- [x] API health URL filled and reachable  

- [ ] At least one real testnet tx hash linked (target 10+ wallet interactions)  
- [ ] Recording uploaded and linked  
- [ ] Contract testnet deploy address filled (or program confirms Horizon-only is accepted)  
- [ ] Feedback summary filled  
- [ ] Screenshots: UI, mobile, analytics  
- [ ] CORS: `FRONTEND_URL` on API matches the live frontend origin ([`deploy/wire-cors.md`](./deploy/wire-cors.md))  
- [ ] `ALLOW_SIMULATE=false` on production API  
- [x] GrantFox / official links include repo + live frontend  
