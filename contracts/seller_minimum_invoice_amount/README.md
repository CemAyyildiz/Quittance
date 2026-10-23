# seller-minimum-invoice-amount

Standalone Soroban contract: per-seller minimum invoice amount.

Admin sets a minimum invoice amount per seller; invoice creation below that
minimum is rejected.

## Purpose

Quittance invoices are denominated in stroops (`i128`). Sellers who issue very
small invoices (test amounts, dust, accidental micro-payments) may want to set
a floor so that invoice creation below the floor is rejected.

This crate is a self-contained learning/utility contract in the same family as
the other standalone `contracts/*` crates. It is **not** wired into the
frontend, backend, or any other contract in this repo.

## Public API

| Function                  | Returns         | Purpose                                                            |
|---------------------------|-----------------|--------------------------------------------------------------------|
| `set_minimum(seller, minimum)` | `Result<(), Error>` | Persist the minimum for `seller`; rejects negative minimums. |
| `minimum_for(seller)`     | `i128`          | Return the minimum for `seller`; defaults to `0` when unset.       |
| `is_valid_amount(seller, amount)` | `bool` | `true` when `amount >= minimum_for(seller)`.              |

## Semantics

- A minimum must be non-negative; negative minimums are rejected with
  [`Error::NegativeMinimum`].
- `minimum_for` defaults to `0` (no minimum) for sellers without a stored
  override.
- "At or above the minimum" passes; amounts below it are invalid.

## Errors

`Error` carries a stable `#[repr(u32)]` discriminant:

| Variant             | Code | Cause                                |
|---------------------|------|--------------------------------------|
| `NegativeMinimum`  | 1    | `minimum < 0`                        |

## Build and test

```sh
cargo test --manifest-path contracts/seller_minimum_invoice_amount/Cargo.toml
cargo clippy --manifest-path contracts/seller_minimum_invoice_amount/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.

## License

MIT
