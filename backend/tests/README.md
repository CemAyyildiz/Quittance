# Backend tests

Smoke tests live alongside `src/` and run with Node's built-in test runner
(`node:test`) executed through `tsx` (already in `backend/package.json`
devDependencies). No extra dependencies or copies are required.

## Run all backend tests

From the project root:

```bash
cd backend
npm install   # one-time, installs dev dependencies including tsx
npx tsx --test tests/*.test.ts
```

From anywhere (downloads `tsx` on demand if missing):

```bash
npx tsx --test backend/tests/memory-storage.test.ts
```

Run a single file:

```bash
cd backend
npx tsx --test tests/memory-storage.test.ts
```

## Requirements

- Node.js >= 18 (uses the `node:test` and `node:assert/strict` built-ins)
- `tsx` >= 4 (already declared as a backend devDependency)

## What is covered

`memory-storage.test.ts` — in-memory invoice storage:

- `createInvoice` populates defaults (`status: PENDING`, `assetCode: XLM`,
  `expiresAt ~ 7 days`, generated `id`, fresh `createdAt`).
- `createInvoice` honors a caller-supplied `id`, `assetCode`, and `assetIssuer`.
- `getInvoiceById` returns the matching invoice and `undefined` for misses.
- A seller-scoped list returns only invoices whose `sellerPublicKey` matches
  the requested seller (multiple sellers, no cross-leak).

Storage is a process-wide singleton; `clear()` is invoked in `beforeEach` to
isolate each test.
