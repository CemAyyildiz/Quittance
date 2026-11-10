# Payment Fee Tier (`payment_fee_tier`)

Standalone Soroban contract primitive calculating fee basis points from a seller's cumulative volume against ascending volume thresholds.

## Public API

- `fee_bps_for_volume(env: Env, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> Result<u32, FeeTierError>`
- `quote_tier(env: Env, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> Result<FeeTierQuote, FeeTierError>`
- `compute_fee_amount(env: Env, payment_amount: i128, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> Result<i128, FeeTierError>`

## Build & Test

```bash
cargo test --manifest-path contracts/payment_fee_tier/Cargo.toml
cargo clippy --manifest-path contracts/payment_fee_tier/Cargo.toml --all-targets -- -D warnings
```
