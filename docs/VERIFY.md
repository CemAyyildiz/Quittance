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

### Asset

A Stellar asset is identified by the pair **(code, issuer)**, never by the code alone. Anyone can issue a token whose `asset_code` is `USDC`, so comparing codes alone would let a worthless look-alike settle a real USDC invoice. See [`ASSETS.md`](./ASSETS.md).

Verification applies these rules, in order:

1. **Native invoices.** An `XLM` invoice is settled only by a payment Horizon reports as `asset_type: "native"`. A *credit* asset whose code happens to be `XLM` does not settle it.
2. **Code.** `paymentOp.asset_code` must equal `invoice.assetCode`.
3. **Issuer.** For a credit asset, `paymentOp.asset_issuer` must equal `invoice.assetIssuer`.

Rule 3 **fails closed**: an invoice that records no `assetIssuer` for a credit asset cannot be settled at all, rather than being settleable by any token sharing its code. An asset nobody pinned is not an asset anyone agreed to accept. Issuers are compared after trimming surrounding whitespace; an empty issuer counts as none.

The rules live in `paymentAssetMatchesInvoice` (`backend/src/utils/verify-invoice-payment.ts`) and are used by both the pure matcher and the MVP verify handler, so the two cannot drift apart.

> **Note on current implementation:** these checks are enforced on the MVP path (`server-mvp.ts`). The full-server controller implementation does not yet apply them.

## Verification flow

1. Payer submits a Stellar transaction and provides the transaction hash.
2. Backend fetches the transaction from Horizon (`/transactions/{hash}`) and its operations (`/transactions/{hash}/operations`).
3. The payment operation is extracted from the operations list.
4. Each field (memo, amount, destination, asset) is compared against the invoice.
5. If all fields match, the invoice is marked as paid and a proof record is generated.
6. If any field does not match, verification fails and an error is returned.

## Error cases

| Condition | Result |
|---|---|
| Transaction not found on Horizon | Verification fails — transaction does not exist |
| No payment operation in transaction | Verification fails — malformed transaction |
| Memo does not match invoice memo | Verification fails — mismatch |
| Amount does not match invoice amount | Verification fails — mismatch (or partial payment) |
| Destination does not match invoice creator | Verification fails — wrong recipient |
| Asset code does not match invoice asset | Verification fails — `ASSET_MISMATCH` |
| Credit asset issuer differs from `invoice.assetIssuer` | Verification fails — `ASSET_MISMATCH` |
| Credit asset payment or invoice records no issuer | Verification fails — `ASSET_MISMATCH` (fails closed) |
| Non-native payment against an `XLM` invoice | Verification fails — `ASSET_MISMATCH` |

## Horizon reference

- [Transaction resource](https://developers.stellar.org/docs/data/horizon/api-reference/resources/transactions)
- [Operations resource](https://developers.stellar.org/docs/data/horizon/api-reference/resources/operations)
- [Payment operation](https://developers.stellar.org/docs/learn/fundamentals/transactions/list-of-operations#payment)