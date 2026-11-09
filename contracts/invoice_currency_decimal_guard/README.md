# `invoice-currency-decimal-guard`

Standalone Soroban contract implementing an **expected-decimals mismatch guard**.

Pure validator comparing a token's on-chain `decimals()` value against the decimals an invoice expects for its quoted amount, flagging a mismatch before a payment is accepted.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `matches_expected_decimals` | `fn(Env, token_decimals: u32, expected_decimals: u32) -> bool` | Return `true` iff both decimal values are within `[0, MAX_DECIMALS]` and equal. |
| `validate_decimals` | `fn(Env, token_decimals: u32, expected_decimals: u32) -> Result<u32, Error>` | Return `Ok(expected_decimals)` or a typed `Error`. |
| `decimal_delta` | `fn(Env, token_decimals: u32, expected_decimals: u32) -> u32` | Absolute difference between `token_decimals` and `expected_decimals`. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_currency_decimal_guard/Cargo.toml
cargo clippy --manifest-path contracts/invoice_currency_decimal_guard/Cargo.toml --all-targets -- -D warnings
```
