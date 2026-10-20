# `invoice-total-cap`

Per-seller invoice total cap for Quittance, implemented as a standalone
Soroban contract.

The contract keeps a **running total of everything invoiced by a seller** and
compares it against a single **admin-configured cap**. An invoice that would
push a seller past the cap is rejected, and the seller's stored total is left
untouched.

This crate is a self-contained learning/utility primitive. It is **not** wired
into the Quittance frontend, backend, or any other contract in this
repository — it ships and is tested entirely on its own, exactly like the
other crates under `contracts/`. It is also *not* a member of the root
workspace; it declares its own standalone workspace in its `Cargo.toml`.

## What it does

| Concept        | Meaning                                                                        |
|----------------|--------------------------------------------------------------------------------|
| Seller         | A Stellar `Address` that issues invoices. Totals are tracked per address.   |
| Running total  | The sum of every accepted invoice for that seller, in the invoice asset unit. |
| Cap            | The maximum running total a seller may reach. Set by the admin.               |
| Admin          | The `Address` allowed to change the cap. Set once at initialization.           |

Each seller has an **independent** running total: one seller exhausting the
cap does not consume another seller's capacity.

## Public API

### Free functions (pure, no storage)

| Function                                   | Signature                                             | Returns                                        |
|--------------------------------------------|-------------------------------------------------------|------------------------------------------------|
| `would_exceed_cap`                         | `fn would_exceed_cap(running_total: i128, new_amount: i128, cap: i128) -> bool` | `true` when the new total would be above the cap |
| `checked_total`                            | `fn checked_total(running_total: i128, new_amount: i128) -> Option<i128>` | `Some(total)`, or `None` on `i128` overflow |
| `remaining_capacity`                       | `fn remaining_capacity(running_total: i128, cap: i128) -> i128` | Capacity left under the cap, clamped at zero |
| `is_valid_amount`                          | `fn is_valid_amount(amount: i128) -> bool`            | `true` for strictly positive amounts           |

### Contract entry points

| Method                     | Signature                                                                     | Behaviour                                                        |
|----------------------------|-------------------------------------------------------------------------------|------------------------------------------------------------------|
| `initialize`               | `fn initialize(env: Env, admin: Address, cap: i128) -> Result<(), CapError>`  | One-time setup; the admin must authorize.                       |
| `set_cap`                  | `fn set_cap(env: Env, admin: Address, cap: i128) -> Result<(), CapError>`     | Admin-only cap update.                                           |
| `cap`                      | `fn cap(env: Env) -> Result<i128, CapError>`                                  | Current cap.                                                     |
| `running_total`            | `fn running_total(env: Env, seller: Address) -> i128`                         | Seller's running total (`0` for unknown sellers).                |
| `record_invoice`           | `fn record_invoice(env: Env, seller: Address, amount: i128) -> Result<i128, CapError>` | Adds the invoice when the cap allows it and returns the new total. |
| `would_exceed_cap`         | `fn would_exceed_cap(seller: Address, running_total: i128, new_amount: i128, cap: i128) -> bool` | Pure predicate, also callable on-chain.  |
| `would_exceed_cap_for`     | `fn would_exceed_cap_for(env: Env, seller: Address, new_amount: i128) -> Result<bool, CapError>` | Same predicate, but reads the seller's stored total and the configured cap. |
| `remaining_for`            | `fn remaining_for(env: Env, seller: Address) -> Result<i128, CapError>`       | Remaining capacity for a seller.                                 |

The `would_exceed_cap` **free function** takes only the three numbers, so it
can be used by off-chain validators and simulators. The **contract method** has
the same name but also accepts a `seller` address, which keeps the on-chain
call shape aligned with the per-seller model while still producing the same
answer for the same numbers.

### Errors

| Variant            | Code | Meaning                                            |
|--------------------|------|----------------------------------------------------|
| `NotInitialized`   | 1    | A stateful method was called before `initialize`.   |
| `AlreadyInitialized` | 2  | `initialize` was called twice.                     |
| `InvalidCap`      | 3    | The cap was negative.                              |
| `InvalidAmount`   | 4    | The invoice amount was zero or negative.           |
| `CapExceeded`     | 5    | The invoice would push the total above the cap.    |
| `Overflow`        | 6    | Adding the amount overflowed `i128`.               |
| `Unauthorized`    | 7    | The caller is not the configured admin.            |

## Storage model

| Key                    | Storage    | Value                          |
|------------------------|------------|--------------------------------|
| `DataKey::Admin`       | instance   | `Address` of the admin         |
| `DataKey::Cap`         | instance   | `i128` cap                     |
| `DataKey::SellerTotal` | persistent | `i128` running total per seller |

The admin and the cap are global, so they live in instance storage. Running
totals are per seller and live in persistent storage so they survive instance
rollovers.

## Events

| Event                  | Topics                    | Data                          |
|------------------------|---------------------------|-------------------------------|
| `InitializedEvent`     | `admin`                   | `cap`                         |
| `CapUpdatedEvent`      | `admin`                   | `cap`                         |
| `InvoiceRecordedEvent` | `seller`                  | `amount`, `new_total`         |

## Usage

```rust
use invoice_total_cap::{would_exceed_cap, CapError, InvoiceTotalCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let seller = Address::generate(&env);
let contract_id = env.register(invoice_total_cap::InvoiceTotalCap, ());
let client = InvoiceTotalCapClient::new(&env, &contract_id);

client.initialize(&admin, &1_000);

// 400 + 600 lands exactly on the cap, so it is accepted.
let total = client.record_invoice(&seller, &600);
assert_eq!(total, 600);

// The next invoice would exceed the cap and is rejected.
let result = client.try_record_invoice(&seller, &500);
assert!(result.is_err());

// The pure predicate answers the same question without touching storage.
assert!(!would_exceed_cap(600, 400, 1_000));
assert!(would_exceed_cap(600, 401, 1_000));
```

The `CapError` variants are also importable for off-chain matching:

```rust
use invoice_total_cap::CapError;

assert_eq!(CapError::CapExceeded as u32, 5);
```

## Tests

```bash
cargo test --manifest-path contracts/invoice_total_cap/Cargo.toml
```

The suite is split across four integration test files plus a unit-test module:

| File                    | Focus                                                                    |
|-------------------------|--------------------------------------------------------------------------|
| `tests/happy_path.rs`   | Invoices under the cap are accepted and accumulate correctly.            |
| `tests/boundary.rs`     | Exactly-on-the-cap, one-over-the-cap, zero cap, `i128` overflow, cap lowering. |
| `tests/failure.rs`      | Double initialization, negative caps, non-admin updates, uninitialized calls. |
| `tests/scenario.rs`     | Per-seller isolation, admin raising the cap, fresh sellers.              |
| `src/test.rs`           | Unit tests for the storage-backed paths and the pure helpers.            |

## Building for wasm

```bash
# The Soroban environment requires `wasm32v1-none` on Rust 1.84+.
# On Rust 1.81 and older use `wasm32-unknown-unknown` instead.
rustup target add wasm32v1-none
cargo build \
  --manifest-path contracts/invoice_total_cap/Cargo.toml \
  --target wasm32v1-none \
  --release
```

## Out of scope

- Wiring into the Quittance frontend, backend, or invoice/payment flow.
- Cross-contract calls to any other crate in this repository.
- Deployment scripts or testnet/mainnet deployment.
- Multi-asset caps, per-seller caps, or cap changes that retroactively
  invalidate already-recorded invoices.
- Changes to `contracts/Cargo.toml` — this crate stays a standalone
  workspace, like most crates under `contracts/`.

## License

MIT.
