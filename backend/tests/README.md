# Backend tests

Smoke tests live alongside `src/` and run with **Vitest** (`npm test` is
wired to `vitest run` in `backend/package.json`; Vitest is already a
devDependency). No extra dependencies or copies are required.

## Run all backend tests

From the project root:

```bash
cd backend
npm install   # one-time, installs dev dependencies including Vitest
npm test
```

Run a single file:

```bash
cd backend
npm test -- tests/memory-storage.test.ts
```

Iterate with watch mode:

```bash
cd backend
npm run test:watch
```

## Requirements

- Node.js >= 18
- Vitest >= 4 (already declared as a backend devDependency)

## What is covered

`memory-storage.test.ts` — in-memory invoice storage:

- `createInvoice` populates defaults (`status: PENDING`, `assetCode: XLM`,
  `expiresAt ~ 7 days`, generated `id`, fresh `createdAt`).
- `createInvoice` honors a caller-supplied `id`, `assetCode`, and `assetIssuer`.
- `getInvoiceById` returns the matching invoice and `undefined` for misses.
- Memo lookup: `getInvoiceByMemo` returns the matching invoice and
  `undefined` for an unknown memo.
- Seller filter: a seller-scoped list returns only invoices whose
  `sellerPublicKey` matches the requested seller (multiple sellers, no
  cross-leak), including through `InvoiceMemoryService.getInvoicesBySeller`.
- `markExpiredInvoices` transitions past-dated `PENDING` invoices to
  `EXPIRED` while leaving fresh and non-pending rows alone.

`mvp-invoice-expiry.test.ts` — MVP server expiry behavior, driven over HTTP
with Horizon mocked (issue #559):

- Past-due invoices are rejected with `INVOICE_EXPIRED` before Horizon is
  contacted, are hidden from listings, and count as expired in stats.
- Valid pending invoices still settle; paid invoices are left alone.

Storage is a process-wide singleton; `clear()` is invoked in `beforeEach` to
isolate each test.
