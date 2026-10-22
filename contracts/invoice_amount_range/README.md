# invoice-amount-range

Standalone Soroban contract: **per-seller invoice amount range validator**.

Validates an invoice amount against a per-seller configured minimum/maximum range.
Each seller independently sets their own acceptable range; checking one seller's range
never reads or affects another seller's configuration.

This crate is not wired into the Quittance frontend, backend, or any other contract in
this repository. It ships and is tested entirely on its own.

## Concept

A seller calls `set_range(seller, min, max)` to register the inclusive `[min, max]` band
of amounts they are willing to accept. `in_range(seller, amount)` then returns `true` when
`amount` falls within that band.

### Rules

1. **Independence** — each seller owns their own range; changing one seller's range leaves
   every other seller's range untouched.
2. **Inclusive bounds** — both `min` and `max` are included: an amount equal to either
   endpoint passes.
3. **Valid range only** — `min` must be ≤ `max` and both must be non-negative (amounts are
   in stroops; a negative amount is not a valid invoice denomination).
4. **Default: open** — a seller with no configured range is considered unconstrained;
   `in_range` returns `true` for any non-negative amount until `set_range` is called.
5. **Updatable** — calling `set_range` again for the same seller replaces the previous range.

## Public API

| Item | Type | Meaning |
|------|------|---------|
| `set_range(seller, min, max)` | `fn(Env, Address, i128, i128) -> Result<(), RangeError>` | Register or update the acceptable amount range for `seller`. |
| `in_range(seller, amount)` | `fn(Env, Address, i128) -> bool` | Whether `amount` falls within `seller`'s configured range. |

### Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `RangeError::InvalidRange` | `1` | `min > max`, or either bound is negative. |

## Example

```rust
use invoice_amount_range::{InvoiceAmountRange, InvoiceAmountRangeClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let seller = Address::generate(&env);
let contract_id = env.register(InvoiceAmountRange, ());
let client = InvoiceAmountRangeClient::new(&env, &contract_id);

// Set a range of 100..=1_000 stroops.
client.set_range(&seller, &100, &1_000);

assert!(client.in_range(&seller, &100));    // at min — accepted
assert!(client.in_range(&seller, &500));    // inside  — accepted
assert!(client.in_range(&seller, &1_000));  // at max — accepted
assert!(!client.in_range(&seller, &99));    // below min — rejected
assert!(!client.in_range(&seller, &1_001)); // above max — rejected
```

## Layout

```
src/lib.rs       contract entry points
src/range.rs     pure range arithmetic (host-testable, no Env dependency)
src/storage.rs   persistent-storage accessors
src/types.rs     storage keys, error codes
tests/           happy path, edge/boundary, failure, and multi-seller suites
tests/common/    shared setup helpers
```

## Build and test

```bash
# Run all tests
cargo test --manifest-path contracts/invoice_amount_range/Cargo.toml

# Lint with all warnings as errors
cargo clippy --manifest-path contracts/invoice_amount_range/Cargo.toml --all-targets -- -D warnings

# Release build
cargo build --release --manifest-path contracts/invoice_amount_range/Cargo.toml
```

## License

MIT — see `LICENSE` at the repository root.
