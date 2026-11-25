# PR: Hide customer email from dashboard invoice rows

Closes #1106

## Summary

Keep customer email out of dashboard invoice rows and public payment responses, while preserving access for the seller who owns the invoice. The change also repairs type errors exposed by the current CI type-checks.

## Motivation

The dashboard may be open where other people can see it. Customer email is optional delivery information and should not be displayed on every invoice row. Sellers still need the email on their invoice details page, while public payment pages and receipts should not expose it.

## Changes

- Remove customer email from dashboard invoice rows and reminder-link accessible names.
- Omit customer email from public invoice, payment-info, verification, and receipt data.
- Include customer email on invoice details only when the connected wallet matches the invoice seller.
- Keep receipt rendering and email-proof actions private to the invoice seller.
- Repair missing dashboard and invoice-detail declarations referenced by the UI.
- Correct backend invoice DTO, storage, and status-history declarations needed by the TypeScript build.
- Add exact stroop amount handling while preserving explicit partial-payment verification; require exact totals in the automatic payment monitor.

## Validation

Passed:

- `cd frontend && npx tsc --noEmit -p tsconfig.json`
- `cd frontend && npm test -- app/__tests__/dashboard-export.test.tsx components/__tests__/PaymentReceipt.test.tsx components/__tests__/InvoiceCard.test.tsx` — 20 tests
- `cd backend && npm run build`
- `cd backend && npm test -- tests/mvp-webhook.test.ts` — 7 tests
- Focused backend tests for amount validation, payment verification, proof anchoring, storage, status history, invoice DTOs, and uncollectible invoices — passed in separate runs
- `git diff --check`

The full backend suite is **not green**: the latest run reports 22 failures and 705 passes across 64 test files. Failures remain in invoice export, muxed-seller creation/payment fixtures, payment verification, and partial-payment endpoints. These need to be resolved before treating the backend test check as passing.

The Vercel check shown on the PR requires authorization from a member of the project team; it is not resolved by a code change.

## Manual review checklist

- Dashboard rows show invoice number, amount, asset, and status without customer email.
- Reminder actions remain usable and their accessible names do not reveal the email.
- The connected seller can see the email on invoice details; other viewers cannot.
- Public payment pages and receipts do not reveal customer email or offer email-proof actions.
- Clearing the email leaves no email value to render on invoice details.
