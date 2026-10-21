# invoice-status-history

Standalone Soroban contract that stores an append-only audit trail of invoice
status changes. It is not connected to the Quittance frontend, backend, or
other contracts.

## What it does

Each invoice `Symbol` has an independent, ordered history of `Transition`
records containing `from: Status`, `to: Status`, and `at: u64`. `Status` has
`Pending`, `Paid`, `Expired`, and `Cancelled` variants. `at` is the ledger close
timestamp in Unix seconds, read inside the contract; callers cannot supply it.

The administrator is fixed when the contract is deployed. Only that address
may append. Entries must change status, and each new `from` must equal the
previous entry's `to`. The first entry may start at any status. This is an
audit log, so it does not decide which lifecycle transitions are valid for an
invoice; the authorized caller makes that decision.

## Public API

```rust
__constructor(env: Env, admin: Address)
append(env: Env, invoice_id: Symbol, from: Status, to: Status) -> Result<(), Error>
history_of(env: Env, invoice_id: Symbol) -> Vec<Transition>
```

`append` returns `UnchangedStatus` or `DisconnectedTransition` for invalid
entries; missing administrator authorization fails the invocation. `history_of`
is public and returns an empty vector for an invoice with no entries. There is
no update or delete method. Histories live in persistent Soroban storage, with
their TTL extended on use. Like all Soroban storage, an inactive history can
become archived and must be restored to read it; this contract does not promise
permanent availability without storage maintenance.

## Build and test

From the repository root:

```sh
cargo build --manifest-path contracts/invoice_status_history/Cargo.toml
cargo test --manifest-path contracts/invoice_status_history/Cargo.toml
cargo clippy --manifest-path contracts/invoice_status_history/Cargo.toml --all-targets -- -D warnings
```

The four test modules cover ordered appends, empty and maximum-length invoice
IDs, rejected transitions and missing authorization, and histories interleaved
across invoices. This crate has its own Cargo workspace and is not a member of
`contracts/Cargo.toml`.

## Out of scope

Deployment, cross-contract calls, and integration with the invoice/payment
flow are separate work.

## License

MIT.
