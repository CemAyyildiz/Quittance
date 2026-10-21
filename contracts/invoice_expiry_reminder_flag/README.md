# Invoice Expiry Reminder Flag

A standalone Soroban utility contract implementing a one-shot expiry-reminder-sent flag.

## Overview

A one-way flag recording that an "invoice nearing expiry" reminder has already been handled for a given invoice id, so a calling system knows not to repeat it; does not send anything itself, purely state.

This is a self-contained learning/utility contract in the same family as the existing `contracts/*` crates. It is not wired into the frontend, backend, or any other contract in this repository.

## Public API

```rust
pub fn mark_reminded(
    env: Env,
    invoice_id: Symbol,
) -> bool;

pub fn was_reminded(
    env: Env,
    invoice_id: Symbol,
) -> bool;
```

## Building and Testing

Run tests with Cargo:

```bash
cargo test --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml
```

Run Clippy:

```bash
cargo clippy --manifest-path contracts/invoice_expiry_reminder_flag/Cargo.toml --all-targets -- -D warnings
```
