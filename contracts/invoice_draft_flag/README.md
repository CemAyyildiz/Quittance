# `invoice-draft-flag`

Standalone Soroban contract implementing a **one-way draft-to-published invoice flag**.

Marks an invoice as a draft until explicitly published; the draft-to-published transition can only happen once in that direction, and a published invoice can never be reverted to draft.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `publish` | `fn(Env, seller: Address, invoice_id: Symbol) -> Result<(), Error>` | Transition `invoice_id` from draft to published once; requires `seller` auth. |
| `is_draft` | `fn(Env, invoice_id: Symbol) -> bool` | Return `true` if `invoice_id` has not yet been published. |
| `is_published` | `fn(Env, invoice_id: Symbol) -> bool` | Return `true` if `invoice_id` has been published. |
| `published_by` | `fn(Env, invoice_id: Symbol) -> Option<Address>` | Return the seller address that published `invoice_id`, if any. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_draft_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_draft_flag/Cargo.toml --all-targets -- -D warnings
```
