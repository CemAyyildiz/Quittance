# `payment-fee-tier`

Standalone Soroban contract implementing a **cumulative-volume fee tier calculator**.

Pure calculator that looks up a fee-bps tier based on a seller's cumulative payment volume against configured `(min_volume, fee_bps)` thresholds, so higher-volume sellers automatically qualify for lower fee tiers.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `fee_bps_for_volume` | `fn(Env, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> u32` | Return the `fee_bps` for the highest volume threshold satisfied by `cumulative_volume`. |
| `fee_bps_for_volume_checked` | `fn(Env, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> Result<u32, FeeTierError>` | Validated lookup that rejects negative volumes, unsorted thresholds, or `fee_bps > 10_000`. |
| `calculate_fee_amount` | `fn(Env, payment_amount: i128, cumulative_volume: i128, thresholds: Vec<(i128, u32)>) -> Result<i128, FeeTierError>` | Compute the fee in stroops for `payment_amount` at the resolved tier. |

## Build & Test

```bash
cargo test --manifest-path contracts/payment_fee_tier/Cargo.toml
cargo clippy --manifest-path contracts/payment_fee_tier/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
