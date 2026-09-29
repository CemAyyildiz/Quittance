# quittance-status-transitions

Pure helper crate for validating invoice-status transitions in the
Quittance protocol.

## Overview

Every Quittance invoice moves through a well-defined lifecycle:

```
                 ┌──────────┐
                 │  Pending │
                 └────┬─────┘
         ┌────────────┼────────────┐
         ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌────────────┐
  │   Paid   │ │ Expired  │ │ Cancelled  │
  └──────────┘ └──────────┘ └────────────┘
    TERMINAL      TERMINAL      TERMINAL
```

This crate codifies the rules so every layer (smart contract, off-chain
worker, API, dashboard) enforces the same transitions.

## Usage

```rust
use quittance_status_transitions::{is_allowed, allowed_targets, InvoiceStatus};

// Check if a transition is valid
assert!(is_allowed(InvoiceStatus::Pending, InvoiceStatus::Paid));

// Terminal states cannot transition further
assert!(!is_allowed(InvoiceStatus::Paid, InvoiceStatus::Pending));

// Get all valid targets from a given status
let targets = allowed_targets(InvoiceStatus::Pending);
assert_eq!(targets.len(), 3);
```

## Transition table

| From      | To        | Allowed |
|-----------|-----------|---------|
| Pending   | Pending   | ❌      |
| Pending   | Paid      | ✅      |
| Pending   | Expired   | ✅      |
| Pending   | Cancelled | ✅      |
| Paid      | *         | ❌      |
| Expired   | *         | ❌      |
| Cancelled | *         | ❌      |

## Tests

Run the crate tests from this directory:

```sh
cargo test
```

From the repository root, run the same tests with:

```sh
cargo test -p quittance-status-transitions
```

These tests verify that `Pending` may transition to `Paid`, `Expired`, or
`Cancelled`; terminal statuses have no allowed targets; and self-transitions
are denied.

## License

MIT
