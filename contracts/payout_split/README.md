# payout-split

Basis-point payout splitter for a single payment amount.

The contract checks that payee shares sum to exactly 10_000 basis points, then
divides the amount. Integer division can leave a remainder; that remainder is
added to the last payee so the shares add back to the original amount.

This crate is standalone. It is not a member of the contracts workspace and it
is not called by the Quittance frontend or backend.

## What it does

| Rule | Behavior |
| --- | --- |
| Share total | Must be exactly 10_000. |
| Payee count | 1 through 8. |
| Amount | Zero or positive `i128`. Negative amounts are rejected. |
| Dust | Given to the last payee. |

## Public API

```text
validate_splits(env, bps: Vec<u32>) -> bool
apply_split(env, amount: i128, bps: Vec<u32>) -> Vec<i128>
```

`validate_splits` returns false for an empty list, more than 8 payees, or a
total other than 10_000. `apply_split` panics with `SplitError` in those cases
and when `amount` is negative.

Pure helpers `validate_bps` and `apply_bps` implement the same rules without
Soroban storage.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/payout_split/Cargo.toml
cargo clippy --manifest-path contracts/payout_split/Cargo.toml --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/payout_split/Cargo.toml
```
