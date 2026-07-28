# Quittance Soroban contracts

Soroban smart contracts and supporting libraries for the Quittance invoice-on-Stellar protocol.

## Layout

| Crate | Type | Description |
|-------|------|-------------|
| `amount_scale` | Library (`rlib`) | Stroop-to-display-unit conversion for 7-decimal Stellar assets. Pure math, no dependencies. |
| `asset_allowlist` | Library (`rlib`) | MVP asset code allowlist: exact `"XLM"` / `"USDC"` match. No issuer or trustline checks. |
| `error_codes` | Library (`rlib`) | Shared `ErrorCode` enum with stable `#[repr(u32)]` values and English `message()` strings for all Quittance contracts. |
| `event_invoice_paid` | Library (`rlib`) | Canonical `invoice_paid` event topic and data builder. Ensures every Quittance contract emits the same event shape. |
| `init_once` | Contract (`cdylib`) | Minimal one-shot initialiser guard. Panics on double-init. |
| `quittance_receipt_hash` | Library (`rlib`) | Domain-separated SHA-256 receipt hash for payment proof. Reproducible on-chain via `env.crypto().sha256()`. |
| `seller_bind` | Contract (`cdylib`) | Assert that a provided seller address matches a stored binding. `init` / `set_seller` / `get_seller` / `check_seller`. |
| `usdc_testnet_issuer` | Library (`rlib`) | Read-only accessor for the Stellar testnet USDC issuer constant (`GBBD47IF…`). |

## Quick start

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

## Status

These contracts are not yet deployed or wired into the Quittance web demo (Next.js / Express MVP). The demo works on testnet with manual payments and Horizon verification — deploying Soroban contracts is not required to use the application.

## Scope

Each crate is additive and self-contained. No crate in `contracts/` imports or modifies the frontend or backend MVP. Cross-crate dependencies between Soroban crates will be introduced in a future phase.
