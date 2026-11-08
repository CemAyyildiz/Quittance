# Currency Peg Tolerance (`currency_peg_tolerance`)

Standalone Soroban contract primitive checking whether a quoted peg/conversion rate lies within a configured basis-point tolerance band around a reference rate.

## Public API

- `is_within_band(env: Env, quoted_rate: i128, reference_rate: i128, tolerance_bps: u32) -> bool`
- `evaluate_band(env: Env, quoted_rate: i128, reference_rate: i128, tolerance_bps: u32) -> Result<PegBandEvaluation, PegToleranceError>`
- `require_within_band(env: Env, quoted_rate: i128, reference_rate: i128, tolerance_bps: u32) -> Result<PegBandEvaluation, PegToleranceError>`
- `set_default_tolerance(env: Env, admin: Address, tolerance_bps: u32) -> Result<(), PegToleranceError>`
- `default_tolerance(env: Env) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/currency_peg_tolerance/Cargo.toml
cargo clippy --manifest-path contracts/currency_peg_tolerance/Cargo.toml --all-targets -- -D warnings
```
