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

- [Rust toolchain][rust] (stable)
- `cargo` on `PATH`

## Run locally

```bash
cd contracts
make test          # equivalent to: cargo test --workspace
```

Direct equivalents (no make):

```bash
cd contracts
cargo build  --workspace
cargo check  --workspace --all-targets
cargo test   --workspace
cargo fmt    --all -- --check
```

To target a single crate:

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
