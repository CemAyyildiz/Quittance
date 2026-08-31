# Verification rules

Quittance verifies on-chain Stellar payments by checking that the received transaction matches the invoice expectations. Verification queries the Stellar network via [Horizon](https://developers.stellar.org/docs/data/horizon) — no external oracle or third-party API is required.

## How verification works

When a payer submits a Stellar payment, the payer can trigger verification by providing the transaction hash. The backend fetches the transaction and its operations from Horizon, then checks the following fields against the invoice record.

## Verified fields

### Memo

The transaction **memo** must exactly match the invoice memo. The memo is how Quittance links an on-chain payment to a specific invoice. Verification compares the `memo` field on the Horizon transaction resource (`/transactions/{hash}`) against the stored invoice memo. Type and value must both match.

### Amount

The payment operation **amount** must match the invoice amount (within the asset's precision). The amount is read from the payment operation in the transaction's operations endpoint (`/transactions/{hash}/operations`). Both values are compared after normalising to 7 decimal places to avoid floating-point mismatches.

### Destination

The payment operation **to** field must match the invoice creator's Stellar public key. This ensures the payment was received by the correct account and not an unintended destination. The destination is read from the payment operation's `to` field via Horizon.

> **Note on current implementation:** The MVP backend (`server-mvp.ts`) actively verifies the `to` field matches the invoice's `sellerPublicKey`. However, the full-server implementation (`invoice.controller.ts`) currently omits this destination check.

### Asset (implied)

The payment operation's asset (native XLM or a issued asset with code and issuer) must match the asset specified in the invoice. This check is performed alongside the amount check to ensure the correct asset was sent.

> **Note on current implementation:** Similar to destination verification, the MVP backend correctly enforces asset type matching (`asset_code` and `asset_type`). This validation is fully implemented in the MVP mode but is currently missing in the full-server controller implementation.

## Verification flow

1. Payer submits a Stellar transaction and provides the transaction hash.
2. Backend fetches the transaction from Horizon (`/transactions/{hash}`) and its operations (`/transactions/{hash}/operations`).
3. The payment operation is extracted from the operations list.
4. Each field (memo, amount, destination, asset) is compared against the invoice.
5. If all fields match, the invoice is marked as paid and a proof record is generated.
6. If any field does not match, verification fails and an error is returned.

## Invoice expiry

Every invoice carries an `expiresAt`. On the MVP path (`server-mvp.ts`) expiry is enforced in two places:

- **A periodic sweep.** `markExpiredInvoices()` runs every 60 seconds — the same cadence the Postgres path uses in `payment-monitor.service.ts` — transitioning past-due `PENDING` invoices to `EXPIRED`. Reads (`GET /api/invoices/:id`, the list, and stats) sweep as well, so a lookup made a second after expiry cannot report a stale `PENDING` while waiting for the next tick.
- **A settlement guard.** `POST /api/invoices/:id/verify` decides expiry *before* contacting Horizon: a stale invoice is not settleable whatever the chain says, so there is no reason to spend the round trip.

An invoice is expired once `expiresAt` is strictly in the past, matching the storage sweep; an invoice verified at exactly `expiresAt` is still settleable. A past-due invoice returns `INVOICE_EXPIRED` whether or not the sweep has reached it yet, so the answer does not depend on sweep timing.

## Error cases

| Condition | Result |
|---|---|
| Transaction not found on Horizon | Verification fails — transaction does not exist |
| No payment operation in transaction | Verification fails — malformed transaction |
| Memo does not match invoice memo | Verification fails — mismatch |
| Amount does not match invoice amount | Verification fails — mismatch (or partial payment) |
| Destination does not match invoice creator | Verification fails — wrong recipient |
| Invoice is past its `expiresAt` | Verification fails — `INVOICE_EXPIRED` (checked before Horizon) |
| Invoice already swept to `EXPIRED` | Verification fails — `INVOICE_EXPIRED` |
| Asset does not match invoice asset | Verification fails — wrong asset |

## Horizon reference

- [Transaction resource](https://developers.stellar.org/docs/data/horizon/api-reference/resources/transactions)
- [Operations resource](https://developers.stellar.org/docs/data/horizon/api-reference/resources/operations)
- [Payment operation](https://developers.stellar.org/docs/learn/fundamentals/transactions/list-of-operations#payment)