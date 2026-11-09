# `refund-cap-per-invoice`

Standalone Soroban contract implementing a **cumulative refund cap per invoice**.

Tracks cumulative refunds issued against a single invoice ID and rejects any refund that would push the running total above the invoice's original payment amount.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `record_refund` | `fn(Env, invoice_id: Symbol, original_amount: i128, refund_amount: i128) -> Result<i128, Error>` | Add `refund_amount` to `invoice_id`'s cumulative refund total if `<= original_amount`. |
| `refunded_so_far` | `fn(Env, invoice_id: Symbol) -> i128` | Return the cumulative amount refunded for `invoice_id` (`0` if none). |
| `remaining_refundable` | `fn(Env, invoice_id: Symbol, original_amount: i128) -> Result<i128, Error>` | Return `original_amount - refunded_so_far(invoice_id)`. |

## Build & Test

```bash
cargo test --manifest-path contracts/refund_cap_per_invoice/Cargo.toml
cargo clippy --manifest-path contracts/refund_cap_per_invoice/Cargo.toml --all-targets -- -D warnings
```
