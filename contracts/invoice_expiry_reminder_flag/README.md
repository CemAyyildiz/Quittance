# Invoice Expiry Reminder Flag (`invoice_expiry_reminder_flag`)

Standalone Soroban contract primitive implementing a one-way flag that records whether an invoice-nearing-expiry reminder has already been handled for a given invoice ID.

## Public API

- `mark_reminded(env: Env, invoice_id: Symbol) -> bool`
- `was_reminded(env: Env, invoice_id: Symbol) -> bool`
- `try_mark_once(env: Env, invoice_id: Symbol) -> Result<ReminderRecord, ReminderFlagError>`
- `reminder_record(env: Env, invoice_id: Symbol) -> Result<ReminderRecord, ReminderFlagError>`
- `total_reminded_count(env: Env) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml --all-targets -- -D warnings
```
