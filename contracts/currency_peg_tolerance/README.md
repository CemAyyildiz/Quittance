# `currency-peg-tolerance`

Standalone Soroban contract implementing a **peg-rate tolerance band checker**.

Pure calculator checking whether a quoted peg/conversion rate falls within a configured basis-point tolerance band (`tolerance_bps` out of `10_000`) around a reference rate.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `is_within_band` | `fn(Env, quoted_rate: i128, reference_rate: i128, tolerance_bps: u32) -> bool` | Return `true` if `quoted_rate` lies within `reference_rate ± (reference_rate * tolerance_bps / 10_000)`. |
| `validate_rate` | `fn(Env, quoted_rate: i128, reference_rate: i128, tolerance_bps: u32) -> Result<(), Error>` | Fallible check returning a typed `Error`. |
| `band_bounds` | `fn(Env, reference_rate: i128, tolerance_bps: u32) -> Result<(i128, i128), Error>` | Return `(min_allowed, max_allowed)` for `reference_rate` and `tolerance_bps`. |

## Build & Test

```bash
cargo test --manifest-path contracts/currency_peg_tolerance/Cargo.toml
cargo clippy --manifest-path contracts/currency_peg_tolerance/Cargo.toml --all-targets -- -D warnings
```
