# Payment proof fields

A *quittance* is the payment proof Quittance produces for every verified on-chain Stellar payment. The proof is the product: it belongs to the **invoice creator (the owner)** and is the record they keep for tax, accounting, or client handoff. Quittance deliberately scopes the proof so other wallet owners are not identified, named, or doxxed.

This page documents the field set, its source, and the owner-proof principle. Field semantics and the on-chain checks that produce a verified proof are defined in [`docs/VERIFY.md`](./VERIFY.md). Architectural context (why we never infer wallet identity) is in [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) and [`PLAN.md`](../PLAN.md) §4.

## Fields

The proof document for a single payment contains the following fields. Each field is sourced from the on-chain Stellar transaction, the invoice record the owner created, or the runtime configuration of the verifier.

| Field | Description | Source |
|---|---|---|
| **Invoice ID** | Unique identifier of the invoice; matches the URL slug on `/pay/[id]`. | Invoice record (owner-created) |
| **Amount** | Payment value in the smallest unit of the asset (stroops for XLM, equivalent units for issued assets). Verify normalises to 7 decimal places before comparison. | Stellar `payment.amount` |
| **Asset** | Asset code plus, for non-native assets, the issuing account. Issued assets are identified by `code:issuer`, never by code alone, to avoid ambiguity. | Stellar `payment.asset_type`, `asset_code`, `asset_issuer` |
| **Memo** | The transaction memo the payer attached. This is how Quittance links an on-chain payment to a specific invoice; type and value must match exactly. | Stellar `transaction.memo` |
| **Destination** | The Stellar account that received the payment — the invoice creator's wallet. Confirms funds reached the seller, not a third party. | Stellar `payment.to` |
| **Transaction hash (tx)** | The Stellar transaction hash; the immutable proof entry. Doubles as a unique receipt id and as a one-click link to the network explorer. | Stellar `transaction.hash` |
| **Network** | The Stellar network on which the payment was verified (e.g. `TESTNET` or `PUBLIC`). The same field appears on the explorer link so a reader can tell where to look. | Runtime configuration |
| **Paid at** | Timestamp recorded for the verified payment. | Set on the invoice when verify succeeds against Horizon |
| **Parties** | Wallets involved in the payment. The receiver is the seller's own wallet (they recognise themselves). The sender appears as a raw Stellar public key — Quittance never infers, looks up, or attaches a real-world identifier to it. | Stellar `payment.from` / `payment.to` |
| **Description** (optional) | Line item the seller attached at invoice creation (e.g. "Logo design — revision 2"). Repeats verbatim what the seller typed. | Invoice record (owner-supplied) |
| **Seller metadata** (optional) | Seller name/email the seller added to their own invoice for their bookkeeping. Appears because the seller typed it; not because Quittance inferred it. | Invoice record (owner-supplied) |

## What is deliberately not in the proof

The proof **does not** include — and Quittance does not collect — any of the following:

- A real-world name or email for the payer (client). Quittance does not infer, look up, or attach off-chain identity to the payer's Stellar public key.
- Phone numbers, legal-entity identifiers, IP addresses, device fingerprints, or KYC data for any other wallet.
- A "reputation" score, prior-invoice count, or inferred identity for any wallet other than the owner's. Inferring who owns another wallet is not part of the product ([`PLAN.md`](../PLAN.md) §1).
- Cross-invoice history for any wallet other than the owner's. The dashboard and stats are wallet-scoped ([`PLAN.md`](../PLAN.md) §4 / [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)).
- Any token, signed attestation, or off-chain record that could be used to doxx another wallet owner.

## Owner-proof principle

- **A quittance is the owner's record** of an invoice they themselves created.
- **The owner's identity** (their Freighter wallet, optional seller name, optional seller email) is theirs to add and to disclose.
- **The payer's identity, as far as the proof goes, is a Stellar public key.** Quittance never infers, looks up, or attaches a real-world name, email, or other off-chain identifier to the payer's wallet. The only sender data Quittance writes from verify is `payerPublicKey` — taken directly from the Stellar operation.
- **Wallet-scoped privacy.** The dashboard shows only the connected `sellerPublicKey`'s invoices; other sellers' invoices are never listed.

Seller-typed `customerName` / `customerEmail` on an invoice are the seller's own bookkeeping (notes about who the invoice is for). They are seller-supplied, not data Quittance collects, and they are not part of the on-chain verified record.

This matches the product thesis: settlement stays on-chain, the proof goes to the owner, and other people's wallet history stays private.

## Verifying the field set

Field semantics and the exact comparison rules for memo, amount, destination, and asset are defined in [`docs/VERIFY.md`](./VERIFY.md). A quittance is only produced after the backend's verify call confirms each on-chain field matches the invoice against Horizon. Asset-specific guidance (XLM-first MVP, testnet USDC) is in [`docs/ASSETS.md`](./ASSETS.md).
