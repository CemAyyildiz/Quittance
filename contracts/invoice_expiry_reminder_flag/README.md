# `invoice-expiry-reminder-flag`

Standalone Soroban contract implementing a **one-shot expiry-reminder-sent flag**.

A one-way flag recording that an "invoice nearing expiry" reminder has already been handled for a given invoice ID, so calling systems never repeat the reminder.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `mark_reminded` | `fn(Env, invoice_id: Symbol) -> bool` | Mark `invoice_id` as reminded; returns `true` on first call, `false` if already marked. |
| `was_reminded` | `fn(Env, invoice_id: Symbol) -> bool` | Return `true` if `invoice_id` has already been marked reminded. |
| `try_mark_reminded` | `fn(Env, invoice_id: Symbol) -> Result<(), Error>` | Fallible variant returning `Error::AlreadyReminded` on repeat calls. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml --all-targets -- -D warnings
```
