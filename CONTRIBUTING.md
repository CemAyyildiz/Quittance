# Contributing to Quittance

Thanks for your interest in contributing! Quittance helps freelancers create invoices, accept payments on Stellar, and generate payment proof.

## Repository

- **README.md** — overview, quick start, and deployment guide
- **PLAN.md** — product model, scope, DoD, phases, and commit order (canonical plan)
- **ROADMAP.md** — short execution checklist (must not diverge from PLAN.md)
- **EVIDENCE.md** — demo URL and testnet proof for reviewers

Read **`PLAN.md`** first. It defines what is in scope for v0.1 and what is not. Do not invent alternate product paths.

---

## Stellar Wave checklist

All contributors must follow these rules before opening a pull request.

### Language

- [ ] All content is **English-only**: documentation, UI strings, comments, commit messages, and code identifiers
- [ ] No Turkish in tracked files

### Scope

- [ ] Change is within **v0.1 scope** defined in [`PLAN.md`](./PLAN.md) §7
- [ ] Identity is **Freighter wallet only** — no Google login gate for create or pay flows
- [ ] Does not introduce features listed as **Out (v0.1)** — no SMTP/Gmail API, no Postgres/Redis, no escrow, no mainnet requirement
- [ ] Does not create overlapping how-to guides; link official Freighter docs when needed

### Ownership

- [ ] One issue per contributor — no shared file ownership within a single PR
- [ ] Additive or new-file changes preferred over editing existing files

### Hot-file conflict rule

Do **not** edit these files — they have open PRs or active work:

| File | Reason |
|------|--------|
| `frontend/app/pay/[id]/page.tsx` | Open PRs #11, #29 |
| `frontend/lib/export.ts` | Open PRs #23, #28 |
| `frontend/components/PaymentReceipt.tsx` | Open PR #24 |
| `frontend/components/TransactionHistory.tsx` | Open PR #25 |
| `frontend/components/PaymentButton.tsx` | Open PR #12 |
| `frontend/components/InvoiceForm.tsx` | Open PR #12 |
| `frontend/lib/stellar.ts` | Open PR #12 |

### Commit discipline

- [ ] One commit = one [`PLAN.md`](./PLAN.md) row
- [ ] Commit messages follow **conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- [ ] Local smoke test passes after each commit

### Pull request

- [ ] PR targets the **default branch** of `CemAyyildiz/Quittance`
- [ ] PR body starts with `Closes #<issue-number>` on the first line
- [ ] PR includes a **Summary** section (2–4 bullets) and a **Testing** section
- [ ] No Co-Authored-By or AI-generated attribution trailers

---

## Development workflow

### Setup

```bash
# Backend (in-memory MVP — no Postgres/Redis required)
cd backend
npm install
cp env.mvp.example .env
npm run dev:mvp     # http://localhost:3001

# Frontend
cd frontend
npm install
cp env.mvp.local .env.local
npm run dev         # http://localhost:3000
```

### Before committing

1. Run a local smoke test: create an invoice, check the API health endpoint
2. Run `npx tsc --noEmit` in the affected workspace if you changed TypeScript files
3. Ensure your author identity matches your GitHub account

### Code style

- TypeScript with strict mode
- Tailwind for styling (no CSS modules or styled-components)
- Prettier formatting — run `npm run format` in `frontend/` if applicable
- Follow existing patterns in the codebase; match surrounding code conventions

---

## Questions?

Open a discussion or check the existing issues before starting work.

For the full product context, see:
- [`README.md`](./README.md) — setup, deploy, and project layout
- [`PLAN.md`](./PLAN.md) — product model, scope, and release phases
- [`ROADMAP.md`](./ROADMAP.md) — commit execution order
