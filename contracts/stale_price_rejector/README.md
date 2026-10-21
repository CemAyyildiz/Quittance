# stale-price-rejector

A standalone, stateless Soroban contract for validating a price timestamp
against a caller-provided current time and maximum permitted age.

## API

- `assert_fresh(price_at: u64, now: u64, max_age_secs: u64) -> bool` returns
  `true` when the price timestamp is not in the future and its age is at most
  `max_age_secs`. The maximum age is inclusive.

## Build and test

```sh
cargo test --manifest-path contracts/stale_price_rejector/Cargo.toml
cargo clippy --manifest-path contracts/stale_price_rejector/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.