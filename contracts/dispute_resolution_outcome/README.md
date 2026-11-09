# `dispute-resolution-outcome`

Standalone Soroban contract implementing a **write-once dispute resolution outcome** store.

Records the final, immutable outcome of a resolved dispute (`Outcome::FavorPayer`, `Outcome::FavorSeller`, or `Outcome::Split`) for a `dispute_id`. Each `dispute_id` can only ever be resolved once; any second attempt is rejected with `Error::AlreadyResolved`.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `resolve` | `fn(Env, dispute_id: Symbol, outcome: Outcome) -> Result<(), Error>` | Record the final `Outcome` for `dispute_id` once and forever. |
| `outcome_of` | `fn(Env, dispute_id: Symbol) -> Option<Outcome>` | Read back the resolved `Outcome` for `dispute_id`, or `None` if unresolved. |
| `is_resolved` | `fn(Env, dispute_id: Symbol) -> bool` | Return `true` if `dispute_id` has been resolved. |
| `payout_shares_bps` | `fn(outcome: Outcome) -> (u32, u32)` | Return `(payer_bps, seller_bps)` corresponding to `outcome`. |

## Build & Test

```bash
cargo test --manifest-path contracts/dispute_resolution_outcome/Cargo.toml
cargo clippy --manifest-path contracts/dispute_resolution_outcome/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
