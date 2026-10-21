# Multi-Sig Approval Counter

A standalone Soroban utility contract implementing an M-of-N distinct-address approval counter.

## Overview

Requires a configurable number of distinct addresses to approve an action id before a boolean flag flips to true; repeated approvals from the same address do not count twice.

This is a self-contained learning/utility contract in the same family as the existing `contracts/*` crates. It is not wired into the frontend, backend, or any other contract in this repository.

## Public API

```rust
pub fn approve(
    env: Env,
    action_id: Symbol,
    approver: Address,
    required: u32,
) -> bool;

pub fn is_approved(
    env: Env,
    action_id: Symbol,
) -> bool;

pub fn approval_count(
    env: Env,
    action_id: Symbol,
) -> u32;

pub fn has_approved(
    env: Env,
    action_id: Symbol,
    approver: Address,
) -> bool;
```

## Error Codes

- `ZeroThreshold (1)`: The `required` approvals parameter was zero.

## Building and Testing

Run tests with Cargo:

```bash
cargo test --manifest-path contracts/multi_sig_approval_counter/Cargo.toml
```

Run Clippy:

```bash
cargo clippy --manifest-path contracts/multi_sig_approval_counter/Cargo.toml --all-targets -- -D warnings
```
