# Quittance contracts

Minimal [Cargo workspace][cargo-workspace] that owns the on-chain Quittance
contracts. The frontend (`frontend/`) and backend (`backend/`) are separate
projects and are not touched from this directory.

## Layout

```
contracts/
|-- Cargo.toml        # Workspace manifest
|-- Makefile          # Local build/test shortcuts (`make test`)
|-- README.md
+-- example/          # Smoke-test crate so the workspace builds
    |-- Cargo.toml
    +-- src/
        +-- lib.rs
```

New contract crates should be added as additional `[workspace] members` in
`contracts/Cargo.toml` and inherit shared metadata from `[workspace.package]`.

## Prerequisites

### Using the Makefile (recommended)

A `Makefile` at the root of `contracts/` provides convenient targets for building and testing every crate:

```bash
cd contracts

# Test every crate (workspace members + standalone)
make test

# Build every crate
make build

# Test a single crate
make test-error_codes
make test-event_invoice_paid

# List all known crate directories
make list
```

Pass additional `cargo` flags via `CARGO_FLAGS`:

```bash
make test CARGO_FLAGS="--release"
```

### Without the Makefile

Test workspace members together:

```bash
cd contracts
cargo test
```

Test a standalone crate by changing into its directory:

```bash
cd contracts/error_codes && cargo test
cd contracts/seller_bind && cargo test
```

Or by specifying its manifest path:

```bash
cargo test --manifest-path contracts/amount_scale/Cargo.toml
cargo test --manifest-path contracts/asset_allowlist/Cargo.toml
cargo test --manifest-path contracts/error_codes/Cargo.toml
cargo test --manifest-path contracts/event_invoice_paid/Cargo.toml
cargo test --manifest-path contracts/quittance_receipt_hash/Cargo.toml
cargo test --manifest-path contracts/seller_bind/Cargo.toml
cargo test --manifest-path contracts/usdc_testnet_issuer/Cargo.toml
```

## Workspace

`contracts/Cargo.toml` defines a virtual workspace with three contract members (`init_once`, `max_amount`, `min_amount`). The other crates are standalone (each has its own `[workspace]` table and lockfile). They can be added to the workspace as they become `soroban-sdk`-version-aligned.

```bash
cargo test -p quittance-contracts-example
```

## Continuous integration

`.github/workflows/contracts.yml` runs `cargo test -p quittance-contracts-example`
on every push or pull request that changes files under `contracts/**`
(or the workflow file itself). The `example` crate is the only currently
testable workspace member; `init_once`, `max_amount`, and `min_amount`
are scoped per the maintainer's "remaining files are in the right lane
for #57 / #229" note. The workflow is path-filtered so PRs that only
touch `frontend/`, `backend/`, `db/`, or the deploy docs do not trigger
it and cannot fail it.

[cargo-workspace]: https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html
[rust]: https://www.rust-lang.org/tools/install
