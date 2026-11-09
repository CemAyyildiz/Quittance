# `payment-receipt-counter`

Standalone Soroban contract implementing a **per-payer successful-payment counter**.

Tracks the number of successful payments a given payer address has made across all invoices, intended as an input for loyalty logic implemented elsewhere.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `record_payment` | `fn(Env, payer: Address) -> u32` | Increment and return the successful-payment count for `payer`. |
| `count_for` | `fn(Env, payer: Address) -> u32` | Return the current successful-payment count for `payer` (`0` if none). |
| `try_record_payment` | `fn(Env, payer: Address) -> Result<u32, Error>` | Checked increment returning `Error::CounterOverflow` at `u32::MAX`. |

## Build & Test

```bash
cargo test --manifest-path contracts/payment_receipt_counter/Cargo.toml
cargo clippy --manifest-path contracts/payment_receipt_counter/Cargo.toml --all-targets -- -D warnings
```
