# `payment-amount-tolerance`

Standalone Soroban contract implementing a **rounding-tolerance payment amount check**.

Pure predicate that accepts a received payment within a small, configured absolute `tolerance` of an invoice's `expected` amount (`|expected - received| <= tolerance`), absorbing unavoidable asset-conversion rounding without allowing arbitrary underpayment.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_within_tolerance` | `fn(Env, expected: i128, received: i128, tolerance: i128) -> bool` | Return `true` if `expected > 0`, `received >= 0`, `tolerance >= 0`, and `\|expected - received\| <= tolerance`. |
| `verify_within_tolerance` | `fn(Env, expected: i128, received: i128, tolerance: i128) -> Result<i128, ToleranceError>` | Validated check returning the signed delta (`received - expected`) or a specific `ToleranceError`. |
| `evaluate` | `fn(Env, expected: i128, received: i128, tolerance: i128) -> ToleranceReport` | Return a structured report with `accepted` and `abs_diff`. |

## Build & Test

```bash
cargo test --manifest-path contracts/payment_amount_tolerance/Cargo.toml
cargo clippy --manifest-path contracts/payment_amount_tolerance/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
