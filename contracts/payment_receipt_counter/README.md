# Payment Receipt Counter (`payment_receipt_counter`)

Standalone Soroban contract primitive tracking the number of successful payments a given payer address has made across all invoices.

## Public API

- `record_payment(env: Env, payer: Address) -> u32`
- `count_for(env: Env, payer: Address) -> u32`
- `record_batch(env: Env, payer: Address, batch_count: u32) -> Result<u32, ReceiptCounterError>`
- `stats_for(env: Env, payer: Address) -> PayerStats`
- `global_count(env: Env) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/payment_receipt_counter/Cargo.toml
cargo clippy --manifest-path contracts/payment_receipt_counter/Cargo.toml --all-targets -- -D warnings
```
