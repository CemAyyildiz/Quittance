# Quittance contracts

Multi-crate [Cargo workspace][cargo-workspace] that owns the on-chain
Quittance contracts. The frontend (`frontend/`) and backend (`backend/`)
are separate projects and are not touched from this directory.

## Workspace members

These crates are listed in `contracts/Cargo.toml` and share a lockfile and
release profile:

| Crate | Purpose |
|---|---|
| `example` | Smoke-test crate so the workspace builds |
| `expiry_check` | Invoice expiry validation |
| `init_once` | One-shot contract initialization guard |
| `max_amount` | Upper-bound amount validation |
| `min_amount` | Lower-bound amount validation |

New Soroban contracts should be added as additional `[workspace] members` in
`contracts/Cargo.toml` and inherit shared metadata from `[workspace.package]`.

## Standalone helper crates

The remaining directories are standalone crates that each declare their own
`[workspace]` table. They are not workspace members but live under
`contracts/` for co-location. Many are dependency-free pure Rust helpers
that compile for both on-chain (Soroban) and off-chain (backend) use.

### Soroban contracts (deployed to chain)

| Crate | Description |
|---|---|
| `auth_one_address` | Minimal single-Address authorization demo |
| `memo_validator` | Validate Stellar text memos (max 28 bytes, printable ASCII) |
| `seller_bind` | Assert a provided seller address matches a stored binding |
| `payer_bind` | Validate an optional payer address against a bound address |
| `meta_info` | Expose contract `name()` and `version()` strings |
| `network_passphrase` | Expose Stellar testnet/public network passphrase constants |

### Pure Rust helpers (no soroban-sdk)

| Crate | Description |
|---|---|
| `amount_scale` | Convert between stroops (i128) and display units for 7-decimal assets |
| `fee_bps_clamp` | Clamp a basis-points value into the valid 0..=10000 range |
| `data_key_prefix` | Prefix instance/persistent storage keys to avoid upgrade collisions |
| `paid_status` | Encode/decode invoice paid status enum (Pending, Paid, Expired, Cancelled) |
| `status_transitions` | Validate invoice status transitions for the Quittance protocol |
| `invoice_claim` | Domain-separated SHA-256 invoice claim hash (seller + amount + memo + expiry) |
| `proof_meta` | Pack/unpack proof metadata struct (amount, asset code, memo, tx hash bytes) |

### Soroban SDK-dependent helpers (rlib)

| Crate | Description |
|---|---|
| `destination_guard` | Reject empty and wrong-length Stellar destination addresses |
| `tx_hash_validate` | Validate 64-char hex transaction hashes |
| `storage_ttl` | Wrap `extend_ttl` bump for instance/persistent/temporary data keys |
| `event_invoice_paid` | Invoice-paid event topic and data builder |
| `error_codes` | Shared Soroban contract error codes with stable numeric values |
| `usdc_testnet_issuer` | USDC testnet issuer address constant |
| `quittance_receipt_hash` | Receipt hash helper for Quittance payments |

## Prerequisites

- [Rust toolchain][rust] (stable)
- `cargo` on `PATH`

## Run locally

Workspace crates:

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

To target a single workspace member:

```bash
cargo test -p expiry_check
```

Standalone helper crates can be tested individually from their own
directories (they are not part of the workspace):

```bash
cd contracts/amount_scale && cargo test
cd contracts/paid_status && cargo test
cd contracts/invoice_claim && cargo test
```

## Continuous integration

`.github/workflows/contracts.yml` runs workspace tests on every push or
pull request that changes files under `contracts/**` (or the workflow file
itself). The workflow is path-filtered so PRs that only touch `frontend/`,
`backend/`, `db/`, or the deploy docs do not trigger it and cannot fail it.

[cargo-workspace]: https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html
[rust]: https://www.rust-lang.org/tools/install
