# `quittance-fee-bps-clamp`

Pure helper crate that clamps a **basis-points** value into the only range that
is meaningful for a fee: `0..=10_000` (0% through 100%).

A basis point (bps) is one hundredth of a percent — `1 bps == 0.01%`, so a full
`100%` is `10_000 bps`. Fees are expressed this way to keep the math in integers
and avoid floating-point rounding.

> **Not used in the Quittance payment flow.** This crate does not read or change
> any invoice amount, and it is intentionally **not** imported into the Next.js
> or Express MVP demos. It exists only so a future fee feature has one tested
> definition of "a bps value is between 0 and 10000" to build on.

This crate is intentionally tiny and dependency-free:

- No payment, storage, or trustline logic.
- Never panics and never overflows — `clamp_bps` only ever returns one of the
  two bounds or the input itself.

## API

| Item                 | Type            | Meaning                                                                 |
|----------------------|-----------------|-------------------------------------------------------------------------|
| `MIN_BPS`            | `const i32`     | Minimum valid value — `0` (0%).                                         |
| `MAX_BPS`            | `const i32`     | Maximum valid value — `10_000` (100%).                                  |
| `clamp_bps(bps)`     | `fn(i32) -> i32`| Clamps into `0..=10_000`. Below floors to `0`, above ceils to `10_000`. |
| `is_valid_bps(bps)`  | `fn(i32) -> bool`| `true` when `bps` is already inside `0..=10_000`.                       |
| `bps_to_whole_percent(bps)` | `fn(i32) -> i32` | Clamps via `clamp_bps`, then converts to a whole-number percent (`clamped / 100`). |

## Examples

```rust
use quittance_fee_bps_clamp::{bps_to_whole_percent, clamp_bps, is_valid_bps, MAX_BPS};

// Negative input floors to 0.
assert_eq!(clamp_bps(-1), 0);

// Mid-range input passes through unchanged (2.5%).
assert_eq!(clamp_bps(250), 250);

// Over 100% ceils to the maximum.
assert_eq!(clamp_bps(10_001), MAX_BPS);
assert_eq!(clamp_bps(i32::MAX), 10_000);

// Prefer rejecting out-of-range values instead of clamping? Ask first.
assert!(is_valid_bps(250));
assert!(!is_valid_bps(10_001));

// Whole-number percent: clamps first, then divides by 100 (truncating).
assert_eq!(bps_to_whole_percent(250), 2);
assert_eq!(bps_to_whole_percent(10_000), 100);
assert_eq!(bps_to_whole_percent(50_000), 100); // out-of-range, clamped first
```

## Scope and non-goals

In scope:

- The pure clamp: floor at `0`, ceil at `10_000`, pass valid values through.
- Constant exposure of `MIN_BPS` and `MAX_BPS`.
- Unit-test coverage of the required edge cases: **negative**, **mid-range**,
  and **over 10000**, plus exact boundaries, idempotence, and range validation.

Out of scope (matches `contracts/fee_bps_clamp/` task spec):

- Changing payment amounts or any invoice math.
- Wiring into the frontend pay flow or the Express MVP demo.
- Computing an actual fee from the bps value — this crate only bounds the value.
- Other crates.

## Running the tests

This crate has no external dependencies, so it only needs a standard Rust
toolchain (1.74+ recommended). Install from <https://rustup.rs> if missing:

```bash
cd contracts/fee_bps_clamp
cargo test
```
