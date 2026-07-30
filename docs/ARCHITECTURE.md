# Quittance — Architecture (one-pager)

Quittance produces **payment proof** (a *quittance*) for invoices a freelancer
issues on Stellar. This page is the short technical map of how the v0.1 demo
fits together. It is deliberately a one-pager — for the full run/setup steps see
[`README.md`](../README.md), and for scope and ship order see
[`PLAN.md`](../PLAN.md).

---

## The loop

```
Create invoice → Pay via link / QR → Verify on-chain → Download or email proof → View history
```

Settlement stays on-chain. Quittance matches **memo + amount + destination** and
gives the invoice owner written proof. It never infers or exposes who owns
another wallet.

---

## Components

```
[ Next.js frontend :3000 ]  --HTTP API-->  [ Express MVP :3001 ]  --Horizon-->  [ Stellar testnet ]
        |                                          |
   Freighter wallet                          In-memory invoices
   Client-side PDF proof / mailto            POST /verify → Horizon chain check
```

| Component | Role | Notes |
|-----------|------|-------|
| **Frontend** — Next.js 14 | UI for create / pay / dashboard / proof | Freighter is the identity; renders the PDF proof in-browser |
| **Backend** — Express `server-mvp.ts` | Invoice API + Horizon-backed verify | In-memory store for the demo; **data is lost on restart** |
| **Horizon** | Read the Stellar network | Testnet by default; used to confirm a payment landed |
| **Stellar testnet** | Settlement | Real on-chain transactions; tx hashes prove payment |

---

## Identity rules (per [`PLAN.md`](../PLAN.md) §4)

These are load-bearing and must not drift:

- **Identity is the Freighter wallet.** A wallet must be connected to create an
  invoice and to pay via Freighter.
- **No Google login and no Google gate.** Google is not required for create or
  pay, and is not used as an access gate anywhere.
- **Email is an optional delivery channel, not a login.** An optional customer
  email enables *Send invoice* / *Email proof* via `mailto:`. It never gates
  access.
- **Privacy by wallet scope.** The dashboard and stats use only the connected
  `sellerPublicKey`; other sellers' invoices are never listed.

---

## Request flow

**Create (freelancer / seller)**

1. Connect Freighter → fill amount, asset, description, optional client
   name/email.
2. Frontend `POST /api/invoices` → backend stores the invoice in memory and
   returns an id.
3. Frontend renders the payment URL (`/pay/[id]`) and a QR code.

**Pay (client / payer)**

1. Open `/pay/[id]` — no Google, no account required.
2. Pay on Stellar via Freighter, QR, or a manual transfer carrying the memo.
3. `POST /api/invoices/:id/verify` asks Horizon whether a matching payment
   landed (memo + amount + destination + asset). Fake hashes are rejected; a
   real matching tx flips the invoice to **PAID**.

**Proof**

- Primary CTA after paid: **Download Proof** (PDF, generated in the browser).
- Secondary: **Email proof** via `mailto:` when a client email exists.
- Proof content: amount, asset, memo, tx hash, explorer link, and the parties
  when available.

---

## Key API surface (MVP)

| Method + path | Purpose |
|---------------|---------|
| `GET /api/health` | Liveness for the deployed API |
| `POST /api/invoices` | Create an invoice (wallet-scoped) |
| `GET /api/invoices` · `GET /api/invoices/:id` | List (own wallet) / fetch one |
| `GET /api/invoices/:id/payment-info` | Payment details for the pay page |
| `POST /api/invoices/:id/verify` | Horizon-backed on-chain verify |
| `POST /api/invoices/:id/cancel` | Cancel a pending invoice |
| `GET /api/invoices/stats` | Wallet-scoped dashboard stats |

`POST /api/invoices/:id/simulate-payment` exists for local development only and
is hidden from the demo UI (guarded by a dev flag).

---

## Deploy shape

- **Frontend:** Vercel (or any Next.js host).
- **Backend MVP:** Render / Railway / Fly.
- **CORS:** `FRONTEND_URL` must equal the public frontend origin.

---

## Deliberately out of scope for v0.1

Postgres / Redis / queues, production SMTP or Gmail API, escrow or a
payment-link marketplace, multi-tenant orgs, and any mainnet requirement
(testnet evidence is sufficient). See [`PLAN.md`](../PLAN.md) §7 for the full
in/out list. The Soroban helper crates under [`contracts/`](../contracts/) are
pure, tested building blocks and are **not** wired into the payment flow.

> This file is a map, not a setup guide. It intentionally does not duplicate the
> install/run instructions in [`README.md`](../README.md).
