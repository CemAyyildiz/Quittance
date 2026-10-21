# basis-points-math

A standalone Soroban contract for overflow-checked basis-points calculations.
One basis point is one ten-thousandth. The API accepts any `u32` rate; it does
not apply a policy-specific cap.

## API

- `mul_bps(amount: i128, bps: u32) -> Option<i128>` returns the amount multiplied
  by `bps / 10_000`, or `None` if the result does not fit in `i128`.
- `checked_add_bps(amount: i128, bps: u32) -> Option<i128>` adds that computed
  basis-points amount to `amount`, returning `None` if the result overflows.

Fractional results are truncated toward zero, matching Rust integer division.
The multiplication is decomposed so a large intermediate product does not cause
a false overflow when the final quotient is representable.

## Build and test

```sh
cargo test --manifest-path contracts/basis_points_math/Cargo.toml
cargo clippy --manifest-path contracts/basis_points_math/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.