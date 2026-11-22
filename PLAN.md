# Quittance — Product & Delivery Plan

**Status:** Locked (Jul 2026)  
**Target release:** Online SCF-ready demo (v0.1)  
**Working style:** One outcome per commit; local smoke must pass after each commit.

This document is not a menu of options. Positioning, scope, and ship order are fixed here.

---

# Documentation surface

Keep the repo lean:

- `README.md` — overview and how to run  
- `PLAN.md` / `ROADMAP.md` — ship plan  
- `EVIDENCE.md` — demo URL and testnet proof for reviewers  
- Env examples — configuration  

Do not add overlapping how-to guides. Link official Freighter docs when needed.

---

## 1. North star

Quittance produces **payment proof** (a quittance) for invoices a freelancer issues on Stellar.

```
Create invoice → Pay via link / QR → Verify on-chain → Download or email proof → View history
```

Settlement stays on-chain. Quittance matches amount + memo and gives the owner written proof. Inferring who owns another wallet is not part of the product.

---

## 2. Why this plan (SCF + reality)

SCF rejection mapped to this plan:

| # | Feedback | Response in this plan |
|---|----------|------------------------|
| 1 | Site must be online | Phase D: public frontend + API |
| 2 | Testnet evidence + clearer tech | Real Horizon verify + tx hashes + video |
| 3 | Delivery confidence | Narrow scope, working demo, readable tech note |
| 4 | Tighten scope | One user: freelancer → client, XLM first (then USDC) |

Codebase is an Oct 2025 MVP + Quittance rebrand. Not deployed yet. The professional path is not a feature pile — it is **shipping one unbroken invoice loop online**.

---

## 3. Target user and job

**User:** Freelancer (or solo merchant) receiving XLM (MVP priority) / USDC on Stellar testnet/public.

**Job:**
1. Invoice a client
2. Get paid via Freighter or QR
3. Auto / semi-auto verification
4. Proof for self and/or client (PDF or email)
5. See invoice history scoped to their wallet

**Not:** SustainOpen/Stellink-style payment-link / escrow product. Quittance = invoice + proof.

A separate marketplace product may call Quittance for payments later; it is out of scope for this repo’s v0.1.

---

## 4. Product model (locked)

### 4.1 Identity

| Layer | Decision |
|-------|----------|
| Identity | **Freighter wallet** |
| Create invoice | Wallet must be connected |
| Pay (Freighter) | Wallet must be connected |
| Google login | **Not required for create/pay; not used as a gate** |

Rationale: Stellar-native UX, frictionless SCF demo, mock Google is not professional.

### 4.2 Email

| Layer | Decision |
|-------|----------|
| Role | **Delivery channel** (send invoice link / payment proof) |
| Required | **Optional** |
| MVP | `customerEmail` on form + **Send invoice / Send proof** → `mailto:` |
| Later | SMTP or Gmail API — still not a login gate |

Rationale: Email was meant for sending, not identity. Clients can also receive the link via chat. Email = convenience.

### 4.3 Runtime (demo)

| Layer | Decision |
|-------|----------|
| Backend | `server-mvp.ts` (in-memory) |
| Frontend | Next.js 14 |
| DB / Redis | Not for demo |
| Verify | **Horizon** on MVP (memo + amount + destination) |
| Simulate payment | Hidden from demo UI (optional dev flag only) |

Document in-memory data loss in README. Postgres comes after the demo.

### 4.4 Proof

Primary CTA after paid: **Download Proof** (PDF).  
Secondary: **Email proof** (mailto when email exists).  
Content: amount, asset, memo, tx hash, explorer link, parties when available.

---

## 5. User journeys

### Freelancer (seller)

1. Open site → connect Freighter  
2. Amount, asset, description, optional client name/email  
3. Create invoice → payment URL + QR  
4. Copy link or **Send invoice** (if email present)  
5. See own invoices on dashboard  
6. When paid → Download Proof / Email proof  

### Client (payer)

1. Open `/pay/[id]` (no Google)  
2. Pay via QR / manual / Freighter  
3. Backend verifies via Horizon → PAID  
4. Receipt + Download Proof  

### Privacy

Dashboard and stats use **only the connected `sellerPublicKey`**. Other sellers’ invoices are never listed.

---

## 6. Architecture (v0.1)

```
[Next.js :3000]  --API-->  [Express MVP :3001]  --Horizon-->  [Stellar Testnet]
     |                            |
  Freighter                  In-memory invoices
  Client PDF / mailto        POST /verify (chain check)
```

**Deploy target:** Frontend on Vercel + Backend MVP on Render / Railway / Fly.  
CORS: `FRONTEND_URL` = public frontend origin.

Full `server.ts` + Postgres is not part of this release. Static env seller vs dynamic wallet mismatch is fixed after the demo.

---

## 7. Scope

### In (v0.1)

- Quittance branding (favicon, copy, footer)
- Wallet-only create / pay
- Optional customer email + mailto send
- Horizon-backed verify
- Wallet-scoped dashboard
- Download Proof + email proof CTAs
- Remove simulate / broken sync from demo UI
- Online deploy + testnet evidence pack

### Out (v0.1)

- Google required login / OAuth gate
- Production Gmail API / SMTP
- Postgres, Redis, Bull
- Escrow, payment-link marketplace, multi-tenant orgs
- Mainnet requirement (testnet is enough)
- Unrelated surfaces (chat, subscriptions, job boards)

---

## 8. Definition of Done — v0.1

All of the following must be true:

1. Public URL loads (frontend + API health)
2. Invoice created with Freighter (no Google)
3. Testnet payment works on `/pay/[id]`
4. Verify rejects fake hashes; real tx → PAID
5. PDF proof downloads; mailto send works when email is set
6. Dashboard shows only the connected wallet’s invoices
7. README has demo URL + ≥1 testnet tx hash + short tech note
8. 2–3 minute screen recording exists

---

## 9. Execution — phases and commits

Each row = **one commit**. You create the commits; agent supplies the message.

### Phase A — Brand and identity model

| ID | Commit | Acceptance |
|----|--------|------------|
| A1 | `fix: Quittance favicon and current footer year` | Favicon shows Q; year is current |
| A2 | `fix: invoice and proof copy across landing and forms` | Invoice/proof language; not generic “payment links” as the product claim |
| A3 | `feat: require wallet only for create and pay` | Google gates removed from create/pay |
| A4 | `feat: optional customer email with mailto send actions` | Send invoice/proof when email exists; otherwise disabled/hidden |
| A5 | `fix: customer fields are client data not seller profile` | No seller→customer auto-fill |

### Phase B — Correct invoice loop

| ID | Commit | Acceptance |
|----|--------|------------|
| B1 | `feat: scope dashboard and stats to connected seller wallet` | No cross-wallet leak |
| B2 | `feat: Horizon-backed verify on MVP server` | Memo + amount + destination check |
| B3 | `fix: remove demo simulate and broken sync from pay UI` | Clean pay page |
| B4 | `feat: store seller and payer metadata on memory invoices` | Parties present on proof |
| B5 | `fix: invoice detail layout and AssetLogo prop usage` | Layout + logos OK |

**Order:** A1→A5, then B1→B5 (B1 and B2 are independent).

### Phase C — Proof surface

| ID | Commit | Acceptance |
|----|--------|------------|
| C1 | `feat: primary Download Proof CTA after payment` | Proof is primary after paid |
| C2 | `chore: align README with shipped proof and wallet-only auth` | Docs match reality |

### Phase D — Online + evidence pack

| ID | Commit / task | Acceptance |
|----|---------------|------------|
| D1 | `chore: frontend production deploy config and env docs` | Frontend deployable |
| D2 | `chore: MVP backend production deploy config` | Public API + CORS |
| D3 | `docs: public demo URL and testnet evidence` | Reviewer one-pager |
| D4 | *(ops)* Deploy + env + smoke | Health + create + pay path |
| D5 | *(ops)* Testnet tx + video + tech note | SCF #2 pack |

### Phase E — After demo (v0.2+, do not start now)

1. Postgres + dynamic `sellerPublicKey` (align full server)  
2. Per-seller payment monitor  
3. SMTP / Gmail API (still optional send)  
4. Server-side PDF  
5. CI  
6. Wire or remove Redis/Bull  

---

## 10. First sprint

```
A1 → A2 → A3 → A4 → A5 → B1 → B2 → B3 → C1 → D1 → D2 → D3 → D4 → D5
```

Insert B4, B5, C2 as needed before going online. Finish Phase D for the public demo.

---

## 11. Demo script (for recording)

1. Connect Freighter (testnet)  
2. Create a 10 XLM invoice; optional client email  
3. Copy link / send via mailto  
4. Pay on `/pay/[id]`  
5. PAID + Download Proof  
6. Show record on dashboard  
7. Open tx on explorer  

Target length: ≤ 3 minutes.

---

## 12. Risks and controls

| Risk | Control |
|------|---------|
| API restart clears invoices | Short demo; document in README; Postgres in v0.2 |
| USDC trustlines | Prove XLM first |
| Freighter is browser-only | Record on desktop |
| Full server vs MVP mix-up | Demo uses only `dev:mvp` / `start:mvp` |

---

## 13. One-line summary

**Wallet is identity; email is delivery; proof is the product; the online demo is the delivery — nothing else enters v0.1.**
