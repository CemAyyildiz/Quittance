# Payment Amount Tolerance (`payment_amount_tolerance`)

Standalone Soroban contract primitive checking whether a received payment falls within a small absolute rounding tolerance of the expected invoice amount.

## Public API

- `is_within_tolerance(env: Env, expected: i128, received: i128, tolerance: i128) -> bool`
- `evaluate(env: Env, expected: i128, received: i128, tolerance: i128) -> Result<AmountToleranceEvaluation, AmountToleranceError>`
- `require_within_tolerance(env: Env, expected: i128, received: i128, tolerance: i128) -> Result<AmountToleranceEvaluation, AmountToleranceError>`

## Build & Test

```bash
cargo test --manifest-path contracts/payment_amount_tolerance/Cargo.toml
cargo clippy --manifest-path contracts/payment_amount_tolerance/Cargo.toml --all-targets -- -D warnings
```
