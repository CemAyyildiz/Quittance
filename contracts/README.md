# Quittance Contracts (Soroban)

Soroban smart contracts for the Quittance invoicing protocol on Stellar.

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) 1.81+
- `rustup target add wasm32-unknown-unknown`
- Optional: [Soroban CLI](https://soroban.stellar.org/docs/cli) for integration tests

## Workspace structure

```
contracts/
├── Cargo.toml          # Workspace manifest
├── Makefile            # Build & test targets
└── README.md           # This file
```

Crate directories (e.g. `network_passphrase/`, `payer_bind/`) will be added by future
issues. Update `Cargo.toml` `members` when a new crate lands.

## Running tests locally

```bash
# From the contracts/ directory:

# Run all checks (fmt, clippy, build, test)
make all

# Run only unit tests
make test

# Build all crates
make build

# Check formatting
make fmt

# Run clippy lints
make clippy

# Clean build artifacts
make clean
```

Individual Make targets can also be scoped:

```bash
# Run tests for a single crate
cargo test -p network_passphrase

# Build a single crate
cargo build -p payer_bind
```

## CI

Contract tests run on every push and pull request that touches `contracts/**`. See `.github/workflows/contracts.yml`.
