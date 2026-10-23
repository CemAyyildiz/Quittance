# invoice-max-count-per-seller

Standalone Soroban contract: **lifetime invoice count cap per seller**.

Caps the total number of invoices a single seller may ever create. Once a seller
reaches the cap, any further creation attempt is rejected with a stable error code.
Each seller's count is independent — exhausting one seller's quota has no effect on
any other seller.

This crate is not wired into the Quittance frontend, backend, or any other contract
in this repository. It ships and is tested entirely on its own.

## Concept

When a seller calls `record_invoice`, the contract increments that seller's lifetime
invoice count and returns the new total. The count starts at `0` ("nothing ever
created") and rises by exactly one per successful call. Once the running count
reaches the configured cap, every subsequent call fails with
`InvoiceCapError::CapExceeded`.

The cap is set at contract construction time and cannot be changed afterwards.

### Rules

1. **Independence** — each seller owns a counter; recording for one seller never
   changes another's.
2. **Monotonicity** — a count only ever moves forward by exactly one.
3. **Hard cap** — a count at the cap cannot be advanced; the call fails instead of
   wrapping or silently dropping the invoice.
4. **No overflow** — arithmetic is checked; `u32::MAX` is the absolute ceiling
   regardless of the configured cap.

## Public API

| Item | Type | Meaning |
|------|------|---------|
| `__constructor(env, cap)` | `fn(Env, u32)` | Deploy the contract and set the per-seller invoice cap. |
| `record_invoice(seller)` | `fn(Env, Address) -> Result<u32, InvoiceCapError>` | Record one invoice for `seller` and return the new count, or fail if the cap is reached. |
| `count_for(seller)` | `fn(Env, Address) -> u32` | Return the number of invoices `seller` has created so far (`0` when none). |
| `remaining_for(seller)` | `fn(Env, Address) -> u32` | Return how many more invoices `seller` may create before hitting the cap. |

### Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `InvoiceCapError::CapExceeded` | `1` | The seller has already reached the configured lifetime invoice cap. |
| `InvoiceCapError::ZeroCap` | `2` | The contract was initialised with a cap of zero, which would immediately block every seller. |

## Example

```rust
use invoice_max_count_per_seller::{InvoiceMaxCountPerSeller, InvoiceMaxCountPerSellerClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let seller = Address::generate(&env);
let cap: u32 = 3;
let contract_id = env.register(InvoiceMaxCountPerSeller, (cap,));
let client = InvoiceMaxCountPerSellerClient::new(&env, &contract_id);

assert_eq!(client.count_for(&seller), 0);
assert_eq!(client.remaining_for(&seller), 3);

assert_eq!(client.record_invoice(&seller), 1);
assert_eq!(client.record_invoice(&seller), 2);
assert_eq!(client.record_invoice(&seller), 3);
assert_eq!(client.remaining_for(&seller), 0);

// Attempting a fourth invoice fails.
let result = client.try_record_invoice(&seller);
assert!(result.is_err());
```

## Layout

```
src/lib.rs       contract entry points and constructor
src/cap.rs       pure cap arithmetic (host-testable, no Env dependency)
src/storage.rs   persistent-storage accessors
src/types.rs     storage keys, error codes, cap constant
tests/           happy path, edge/boundary, failure, and cap-scenario suites
tests/common/    shared test helpers (setup, etc.)
```

## Build and test

```bash
# Run all tests
cargo test --manifest-path contracts/invoice_max_count_per_seller/Cargo.toml

# Lint with all warnings as errors
cargo clippy --manifest-path contracts/invoice_max_count_per_seller/Cargo.toml --all-targets -- -D warnings

# Release build
cargo build --release --manifest-path contracts/invoice_max_count_per_seller/Cargo.toml
```

## License

MIT — see `LICENSE` at the repository root.
