# Invoice Cancellation Window (`invoice_cancellation_window`)

Standalone Soroban contract primitive allowing buyer-initiated invoice cancellation only within a fixed ledger window after invoice creation.

## Public API

- `cancel(env: Env, payer: Address, invoice_id: Symbol, created_at: u32, current_ledger: u32, window: u32) -> Result<CancellationRecord, CancellationError>`
- `is_cancelled(env: Env, invoice_id: Symbol) -> bool`
- `can_cancel_at(env: Env, invoice_id: Symbol, created_at: u32, current_ledger: u32, window: u32) -> bool`
- `cancellation_record(env: Env, invoice_id: Symbol) -> Option<CancellationRecord>`

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_cancellation_window/Cargo.toml
cargo clippy --manifest-path contracts/invoice_cancellation_window/Cargo.toml --all-targets -- -D warnings
```
