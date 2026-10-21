# Payment Receipt Counter

A standalone Soroban utility contract implementing a per-payer successful-payment counter.

## Overview

A simple view-only counter tracking the number of successful payments a given payer address has made across all invoices, intended as an input for loyalty logic implemented elsewhere.

This is a self-contained learning/utility contract in the same family as the existing `contracts/*` crates. It is not wired into the frontend, backend, or any other contract in this repository.

## Public API

```rust
pub fn record_payment(
    env: Env,
    payer: Address,
) -> u32;

pub fn count_for(
    env: Env,
    payer: Address,
) -> u32;

pub fn total_payments(
    env: Env,
) -> u32;
```

## Building and Testing

Run tests with Cargo:

```bash
cargo test --manifest-path contracts/payment_receipt_counter/Cargo.toml
```

Run Clippy:

```bash
cargo clippy --manifest-path contracts/payment_receipt_counter/Cargo.toml --all-targets -- -D warnings
```
