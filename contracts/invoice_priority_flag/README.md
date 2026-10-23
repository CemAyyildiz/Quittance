# invoice-priority-flag

One-time invoice priority flags for Quittance on Stellar.

This crate lets a seller mark an invoice as `Urgent`, `Normal`, or `Low` exactly
once, when the invoice is created. Later attempts to change the priority are
rejected, so downstream sorting and display logic can rely on a fixed value.

It is a standalone Soroban contract. Nothing in `frontend/`, `backend/`, or
another contract calls it, and it is **not** wired into the Quittance
invoice/payment flow; it is the primitive only.

## What it does

Each invoice `Symbol` has at most one priority:

| `Priority` | Meaning                                          |
|------------|--------------------------------------------------|
| `Urgent`   | Sort first / highlight in seller dashboards      |
| `Normal`   | Default ordering                                 |
| `Low`      | Sort last                                        |

`set_priority` requires authorization from the `seller` address and writes the
priority for an invoice that does not have one. The first successful call wins;
any later call returns `Error::AlreadySet` and keeps the stored value. There is
no update or delete method, so the priority is immutable once recorded.

The contract does not verify that `seller` owns the invoice, and it cannot tell
whether a call really happened at invoice creation. Write-once is the mechanism
that makes the value fixed; ownership checks belong to the invoice flow that
integrates this primitive.

Priorities live in persistent Soroban storage keyed by `invoice_id`, with their
TTL extended on every read and write. Like all Soroban storage, an inactive flag
can become archived and must be restored before it can be read; this contract
does not promise permanent availability without storage maintenance.

## Public API

```rust
set_priority(
    env: Env,
    seller: Address,
    invoice_id: Symbol,
    priority: Priority,
) -> Result<(), Error>

priority_of(env: Env, invoice_id: Symbol) -> Option<Priority>
```

`set_priority` returns `Error::AlreadySet` when the invoice already has a
priority; a missing `seller` authorization fails the invocation. `priority_of`
returns `Some(priority)` for a flagged invoice and `None` for an unflagged one;
it never errors.

## Usage

```rust
use invoice_priority_flag::{
    InvoicePriorityFlag, InvoicePriorityFlagClient, Priority,
};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(InvoicePriorityFlag, ());
let client = InvoicePriorityFlagClient::new(&env, &contract_id);
let seller = Address::generate(&env);
let invoice = symbol_short!("INV1");

assert_eq!(client.priority_of(&invoice), None);

client.set_priority(&seller, &invoice, &Priority::Urgent);
assert_eq!(client.priority_of(&invoice), Some(Priority::Urgent));

// A second set is rejected; the original priority is kept.
assert!(client.try_set_priority(&seller, &invoice, &Priority::Low).is_err());
assert_eq!(client.priority_of(&invoice), Some(Priority::Urgent));
```

## Build and test

From the repository root:

```sh
cargo build --manifest-path contracts/invoice_priority_flag/Cargo.toml
cargo test --manifest-path contracts/invoice_priority_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_priority_flag/Cargo.toml --all-targets -- -D warnings
```

Or from this directory:

```sh
cargo test
cargo clippy --all-targets -- -D warnings
```

The crate has its own Cargo workspace (`[workspace]` in `Cargo.toml`) and is not
listed in `contracts/Cargo.toml`'s workspace members, matching most standalone
crates under `contracts/`.

## Tests

The test modules in `src/tests/` cover:

- **Happy path** (`happy_path.rs`) - an unflagged invoice reads as `None`, the
  first priority is stored, reads are stable, and a seller can flag several
  invoices.
- **Boundaries** (`boundaries.rs`) - unknown invoices, all three variants,
  single-character and maximum-length (32 byte) `Symbol` invoice IDs, and
  independent values per invoice.
- **Errors** (`errors.rs`) - a second set is rejected whether it repeats or
  changes the priority, a different seller cannot overwrite it, and a call
  without authorization leaves the invoice unflagged.
- **Priority lock** (`priority_lock.rs`) - the priority stays fixed after
  creation, each invoice has its own lock, and every priority can be chosen
  exactly once.

## Out of scope

Deployment scripts, testnet/mainnet deployment, cross-contract calls, invoice
ownership checks, and integration with Quittance's actual invoice/payment flow
are separate work. This issue ships the standalone primitive only.

## License

MIT.
