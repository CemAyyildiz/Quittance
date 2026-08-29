# `quittance-amount-scale`

Pure helper crate for converting between **stroops** (`i128`, Stellar's
on-chain integer unit) and **display units** for assets that resolve to
**7 decimal places** (XLM and most Stellar-native assets).

This crate is intentionally tiny and dependency-free:

- No payment, storage, or trustline logic.
- All arithmetic uses `i128::checked_*`, so overflow is reported as `None`
  instead of panicking or wrapping.
- Negative inputs are rejected up front (Stellar amounts are non-negative).

It exists so both future Soroban contracts and off-chain workers can do the
display ⇄ stroops conversion with one consistent, tested implementation.

## API

| Item                            | Type                | Meaning                                                                                          |
|---------------------------------|---------------------|--------------------------------------------------------------------------------------------------|
| `DECIMALS`                      | `const u32`         | Number of decimals — `7`. Hard-coded for XLM-style assets.                                       |
| `STROOPS_PER_UNIT`              | `const i128`        | Stroops in one display unit — `10_000_000`. `1 XLM == 10_000_000 stroops`.                       |
| `to_stroops(display)`           | `fn(i128) -> Option<i128>` | Multiplies by `STROOPS_PER_UNIT`. `None` on negative input or overflow.                  |
| `from_stroops(stroops)`         | `fn(i128) -> Option<i128>` | Truncating integer divide by `STROOPS_PER_UNIT`. `None` on negative input.                |
| `remainder_stroops(stroops)`    | `fn(i128) -> Option<i128>` | `stroops mod STROOPS_PER_UNIT`. `None` on negative input. Sub-display-unit residue.        |

## Examples

```rust
use quittance_amount_scale::{to_stroops, from_stroops, remainder_stroops, STROOPS_PER_UNIT};

// 10 XLM billed.
let stroops = to_stroops(10).unwrap();
assert_eq!(stroops, 10 * STROOPS_PER_UNIT);

// 10.5 XLM arrives. Display unit floors to 10, residue is 500_000 stroops.
assert_eq!(from_stroops(10 * STROOPS_PER_UNIT + 500_000), Some(10));
assert_eq!(remainder_stroops(10 * STROOPS_PER_UNIT + 500_000), Some(500_000));

// Negative inputs are rejected.
assert_eq!(to_stroops(-1), None);
assert_eq!(from_stroops(-1), None);

// Overflow on scale-up is reported as None, never a panic.
assert_eq!(to_stroops(i128::MAX), None);
```

## Scope and non-goals

In scope:

- The pure math: `display * 10^7` and `stroops / 10^7`.
- Constant exposure of `DECIMALS` and `STROOPS_PER_UNIT`.
- Strong unit-test coverage of edge cases (zero, `i128::MAX`, sub-unit
  inputs, negative-input rejection, overflow rejection, round-trip identity),
  plus a deterministic 10,000-sample property-style sweep proving
  `from_stroops(to_stroops(display)) == display` across the full safe range.

Out of scope (matches `contracts/amount_scale/` task spec):

- Trustline logic, SAC interactions, or any business rules.
- Storage, instance, or persistent ledger use.
- Configurable decimal precision. This crate is hard-coded to 7 decimals.
  A separate helper is the right place for other precisions; do not version
  this one.
- Wiring to the Next.js or Express MVP demos. That will be done in its own
  PR once the on-chain story (PLAN.md §9 Phase E) needs it.

## Running the tests

This crate has no external dependencies, so it only needs a standard Rust
toolchain (1.74+ recommended). Install from <https://rustup.rs> if missing:

```bash
cd contracts/amount_scale
cargo test
```

`cargo test` regenerates `Cargo.lock` on the first run and prints it to
stderr as quiet informational output; that is expected for a fresh
checkout.
