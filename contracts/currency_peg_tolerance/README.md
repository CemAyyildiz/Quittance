# Currency Peg Tolerance

A standalone Soroban utility contract implementing a peg-rate tolerance band checker.

## Overview

Pure calculator checking whether a quoted peg/conversion rate falls within an admin-configured tolerance band around a reference rate, flagging anything outside the band as invalid.

This is a self-contained learning/utility contract in the same family as the existing `contracts/*` crates. It is not wired into the frontend, backend, or any other contract in this repository.

## Public API

```rust
pub fn is_within_band(
    env: Env,
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> bool;

pub fn check_rate(
    env: Env,
    quoted_rate: i128,
    reference_rate: i128,
    tolerance_bps: u32,
) -> Result<(), PegError>;
```

## Error Codes

- `NonPositiveRate (1)`: Quoted or reference rate is negative or zero.
- `ToleranceExceedsMax (2)`: Tolerance exceeds 10,000 basis points (100%).
- `OutsideToleranceBand (3)`: The quoted rate falls outside `[reference - tol, reference + tol]`.

## Building and Testing

Run tests with Cargo:

```bash
cargo test --manifest-path contracts/currency_peg_tolerance/Cargo.toml
```

Run Clippy:

```bash
cargo clippy --manifest-path contracts/currency_peg_tolerance/Cargo.toml --all-targets -- -D warnings
```
