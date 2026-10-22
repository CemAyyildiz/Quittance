# payment-split-calculator

Standalone Soroban helper crate: fixed-point payment split calculator.

## Purpose

Pure calculator that splits an amount across up to N recipients by
basis-point shares, assigning any rounding remainder to a designated
recipient so the parts always sum exactly to the input.

## API

| Function                                    | Returns                              | Meaning                                                            |
|---------------------------------------------|--------------------------------------|--------------------------------------------------------------------|
| `split_amount(total, shares_bps, remainder_index)` | `Result<Vec<i128>, SplitError>` | Split `total` across `shares_bps` by basis-point share.          |

- Each recipient `i` receives `floor(total * shares_bps[i] / 10_000)`.
- The rounding remainder is assigned to the recipient at `remainder_index`,
  so the parts always sum exactly to `total`.

## Errors

`SplitError` carries stable `#[repr(u32)]` discriminants:

| Variant               | Code | Cause                                     |
|-----------------------|------|-------------------------------------------|
| `NegativeTotal`       | 1    | `total < 0`                               |
| `EmptyShares`         | 2    | `shares_bps` was empty                   |
| `SharesExceedWhole`   | 3    | Shares summed above 10_000 bps (100%)    |
| `InvalidRemainderIndex` | 4 | `remainder_index` out of bounds        |
| `Overflow`            | 5    | Intermediate value overflowed `i128`    |

## Build and test

```sh
cargo test --manifest-path contracts/payment_split_calculator/Cargo.toml
cargo clippy --manifest-path contracts/payment_split_calculator/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.

## License

MIT
