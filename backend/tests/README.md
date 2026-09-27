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

Additional tests under `src/`:

- `utils/format-uptime.test.ts` — formats seconds as seconds, minutes, and hours,
  including zero and larger durations.
- `utils/validation.test.ts` — checks invoice memo validation and generation,
  including format, length, uppercase rules, and uniqueness.
- `utils/env-bool.test.ts` — parses recognized true/false strings, whitespace,
  missing values, and unrecognized values using the supplied default.
- `utils/parse-pagination.test.ts` — checks pagination input parsing and its
  fallback and boundary behavior.
- `utils/asset-helpers.test.ts` — maps Horizon asset types to codes and checks
  native, credit, and unknown asset helpers and constants.
- `utils/amount-compare.test.ts` — compares decimal strings and checks equality
  and ordering helpers across signs, precision, and large values.
- `utils/memo-normalize.test.ts` — trims memo values, detects empty memos, and
  compares memos after normalization.
- `utils/invoice-expiry.test.ts` — checks expiry boundaries and settleability,
  plus sweep interval behavior, stopping, and error handling.
- `utils/verify-invoice-payment.test.ts` — checks invoice payment verification
  outcomes for the payment details and conditions exercised by the tests.
- `utils/verify-errors.test.ts` — checks verification error codes and their
  associated error behavior.
- `utils/verifyTxHash.test.ts` — checks transaction hash validation for accepted
  and rejected inputs.
- `utils/zod-error-format.test.ts` — checks formatting of Zod validation issues.
- `utils/__tests__/verify-errors.test.ts` — checks verification errors and
  their mapping to response details.
- `utils/__tests__/query-public-key.test.ts` — checks public-key extraction and
  validation from query parameters.
- `utils/__tests__/qrcode.test.ts` — checks QR code data generation for the
  inputs covered by the tests.
- `utils/__tests__/public-key-guard.test.ts` — checks public-key guard behavior
  for valid and invalid keys.
- `utils/__tests__/memo.test.ts` — checks invoice memo validation and reference
  generation, including format and uniqueness.
- `utils/__tests__/log.test.ts` — checks structured log output and redaction of
  sensitive keys while retaining ordinary context.
- `utils/__tests__/invoice-status.test.ts` — checks cancellation, expired,
  pending, paid, and cancelled status helpers for each invoice status.
- `utils/__tests__/invoice-dto.test.ts` — checks invoice-to-DTO field mapping,
  optional fields, status preservation, and ISO date serialization.
- `utils/__tests__/cors-origin.test.ts` — checks parsing comma-separated CORS
  origins, whitespace and empty entries, and fallback values.
- `middleware/__tests__/request-id.test.ts` — checks request ID middleware
  behavior for the cases exercised by its tests.
- `middleware/__tests__/request-id.integration.test.ts` — checks request ID
  behavior through the middleware integration path.
- `middleware/__tests__/rate-limit-stub.test.ts` — checks rate-limit stub
  behavior for the cases exercised by its tests.
- `middleware/__tests__/async-handler.test.ts` — checks async handler behavior
  for successful and failing handlers.
- `routes/__tests__/health-detail.test.ts` — checks the health detail HTTP
  response shape, network environment handling, and exposed environment value.

Storage is a process-wide singleton; `clear()` is invoked in `beforeEach` to
isolate each test.
