# Payment proof fields

Quittance generates a proof document for every verified on-chain payment. The proof is designed for the **owner** (the invoice creator) — it provides the record needed for tax, accounting, or official use, without exposing information about other wallet owners.

## Fields

| Field | Description | Source |
|---|---|---|
| **amount** | The value of the payment, in the smallest unit of the asset (e.g. stroops for XLM). | Stellar transaction `amount` |
| **asset** | The asset code and, for non-native assets, the issuing account. | Stellar transaction `asset` |
| **memo** | The memo attached to the payment, used to match the payment to the invoice. | Stellar transaction `memo` |
| **destination** | The Stellar account that received the payment (the invoice creator's wallet). | Stellar transaction `to` |
| **tx** | The Stellar transaction hash, providing an immutable link to the blockchain. | Stellar transaction `hash` |
| **network** | The Stellar network the payment was executed on (e.g. `TESTNET` or `PUBLIC`). | Runtime configuration |
| **parties** | The accounts involved (sender, receiver). Only the receiver (the owner) is identified; the sender is included as a public key without attribution. | Stellar transaction `from` / `to` |

## Owner proof principle

- The proof belongs to the **invoice creator** — it is their discharge (quittance).
- The sender's identity is never inferred or labelled; only their Stellar public key appears in the record.
- No email, name, or off-chain identifier of the sender is collected or stored.