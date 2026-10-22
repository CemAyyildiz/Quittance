# payer-allowlist-per-invoice

Per-invoice payer allowlist for Quittance.

This is a standalone Soroban contract that maintains an optional allowlist of payer addresses
that are permitted to pay a specific invoice. Each invoice can have its own distinct allowlist,
allowing fine-grained control over who can pay which invoice.

This crate is not wired into the Quittance frontend, backend, or any other contract in this
repository. It ships and is tested entirely on its own as a utility primitive that could be
integrated into a payment flow in future work.

## Concept

In some business scenarios, an invoice issuer may want to restrict payment to a specific set
of known payers. This contract enables that by:

1. Storing a per-invoice allowlist of `Address` entries
2. Providing a query function to check if a given payer is allowed for a specific invoice
3. Supporting empty allowlists (meaning all payers are allowed)

When an allowlist is set for an invoice, only the payer addresses in that list are permitted.
If no allowlist has been set (or the allowlist is explicitly cleared), the check defaults to
allowing all payers.

## Public API

The contract exposes two main functions:

### `set_allowlist`

```rust
pub fn set_allowlist(
    env: Env,
    invoice_id: Symbol,
    payers: Vec<Address>
)
```

Sets the allowlist for a given invoice. The `invoice_id` uniquely identifies the invoice,
and `payers` is a vector of Stellar addresses that are permitted to pay this invoice.

- Passing an empty vector clears the allowlist (allowing all payers)
- Passing a non-empty vector restricts payment to only those addresses
- Calling this function multiple times for the same invoice replaces the previous allowlist

### `is_allowed`

```rust
pub fn is_allowed(
    env: Env,
    invoice_id: Symbol,
    payer: Address
) -> bool
```

Returns `true` if the specified `payer` is allowed to pay the invoice identified by `invoice_id`.

- Returns `true` if no allowlist has been set for the invoice (open to all)
- Returns `true` if the payer is in the allowlist
- Returns `false` if an allowlist exists but the payer is not in it

## Build and test

From the repository root:

```bash
# Run all tests
cargo test --manifest-path contracts/payer_allowlist_per_invoice/Cargo.toml

# Run clippy
cargo clippy --manifest-path contracts/payer_allowlist_per_invoice/Cargo.toml --all-targets -- -D warnings

# Release build
cargo build --release --manifest-path contracts/payer_allowlist_per_invoice/Cargo.toml
```

## Example usage

```rust
use soroban_sdk::{Env, Symbol, vec};

// Set up contract
let env = Env::default();
let contract_id = env.register(PayerAllowlistPerInvoice, ());
let client = PayerAllowlistPerInvoiceClient::new(&env, &contract_id);

let invoice_id = Symbol::new(&env, "INV-001");
let alice = Address::generate(&env);
let bob = Address::generate(&env);
let charlie = Address::generate(&env);

// Before setting an allowlist, all payers are allowed
assert!(client.is_allowed(&invoice_id, &alice));
assert!(client.is_allowed(&invoice_id, &bob));

// Set an allowlist for the invoice
let allowlist = vec![&env, alice.clone(), bob.clone()];
client.set_allowlist(&invoice_id, &allowlist);

// Now only Alice and Bob can pay
assert!(client.is_allowed(&invoice_id, &alice));
assert!(client.is_allowed(&invoice_id, &bob));
assert!(!client.is_allowed(&invoice_id, &charlie));

// Clear the allowlist
client.set_allowlist(&invoice_id, &vec![&env]);

// All payers are allowed again
assert!(client.is_allowed(&invoice_id, &charlie));
```

## Test coverage

The test suite includes:

- **Happy path tests** - Basic allowlist setting and checking
- **Edge/boundary cases** - Empty lists, large allowlists, multiple invoices
- **Failure/error cases** - Invalid scenarios and error conditions
- **Isolation tests** - Ensuring invoice allowlists are independent

## Out of scope

- Authorization/authentication (no admin role; anyone can set any allowlist)
- Integration with the Quittance invoice creation or payment flow
- Cross-contract calls or interaction with other contracts
- Deployment scripts or testnet/mainnet deployment
- Frontend or backend changes

## License

MIT
