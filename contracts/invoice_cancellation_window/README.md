# Invoice Cancellation Window

A standalone Soroban utility contract implementing a buyer-side cancellation window for unpaid invoices.

## Overview

Allows a payer-initiated cancellation of an unpaid invoice only within a fixed number of ledgers after its creation; a cancellation attempt after the window closes is rejected.

This is a self-contained learning/utility contract in the same family as the existing `contracts/*` crates. It is not wired into the frontend, backend, or any other contract in this repository.

## Public API

```rust
pub fn cancel(
    env: Env,
    payer: Address,
    invoice_id: Symbol,
    created_at: u32,
    current_ledger: u32,
    window: u32,
);

pub fn can_cancel(
    env: Env,
    created_at: u32,
    current_ledger: u32,
    window: u32,
) -> bool;

pub fn is_cancelled(
    env: Env,
    invoice_id: Symbol,
) -> bool;
```

## Error Codes

- `WindowClosed (1)`: The cancellation attempt occurred after `created_at + window`.
- `InvalidLedger (2)`: The `current_ledger` parameter is strictly less than `created_at`.
- `AlreadyCancelled (3)`: The invoice has already been cancelled.

## Building and Testing

Run tests with Cargo:

```bash
cargo test --manifest-path contracts/invoice_cancellation_window/Cargo.toml
```

Run Clippy:

```bash
cargo clippy --manifest-path contracts/invoice_cancellation_window/Cargo.toml --all-targets -- -D warnings
```
