# invoice-draft-flag

One-way draft-to-published invoice flag for Quittance on Stellar Soroban.

Marks an invoice as a draft until explicitly published by its seller; the draft-to-published transition can only happen once in that direction, and a published invoice can never be reverted to draft.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `publish` | `fn(Env, seller: Address, invoice_id: Symbol) -> Result<(), DraftFlagError>` | Requires `seller.require_auth()` and transitions `invoice_id` from draft to published once. |
| `is_draft` | `fn(Env, invoice_id: Symbol) -> bool` | Returns `true` until `invoice_id` has been published, `false` thereafter. |
| `is_published` | `fn(Env, invoice_id: Symbol) -> bool` | Returns `true` once `invoice_id` has been published. |
| `published_by` | `fn(Env, invoice_id: Symbol) -> Option<Address>` | Returns the seller address that published `invoice_id`, if published. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_draft_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_draft_flag/Cargo.toml --all-targets -- -D warnings
```
