# refund-cap-per-invoice

Cumulative refund cap per invoice for Quittance on Stellar Soroban.

This standalone Soroban utility contract tracks cumulative refunds issued against an `invoice_id` and rejects any partial or full refund that would push the running total above the invoice's original payment amount. It is **not** wired into Quittance's Next.js frontend, Express backend, or other contracts in this repository.

## What it does

When sellers or dispute arbiters issue multiple partial refunds against a single invoice, relying on off-chain bookkeeping alone risks over-refunding beyond the amount originally paid. `RefundCapPerInvoice` maintains two persistent storage entries per `invoice_id` (`DataKey::OriginalAmount(Symbol)` and `DataKey::RefundedTotal(Symbol)`) so per-invoice state scales independently without bloating contract instance storage:

1. **Positive amount validation:** Both `original_amount` and `refund_amount` must be strictly positive (`> 0`).
2. **Original-amount pinning:** The first successful `record_refund` pins `original_amount` for that `invoice_id`. Any later call supplying a different `original_amount` for the same `invoice_id` fails with `RefundCapError::OriginalAmountMismatch`.
3. **Checked cumulative cap:** `current_total.checked_add(refund_amount)` rejects `i128` overflow (`ArithmeticOverflow`) and rejects any total exceeding `original_amount` (`RefundExceedsOriginalAmount`), leaving stored state untouched on error.

Normal Soroban persistent storage TTL and archival rules apply; callers relying on long-lived refund ledgers should extend or restore archived keys as part of standard transaction simulation.

## Public API

```rust
record_refund(
    env: Env,
    invoice_id: Symbol,
    original_amount: i128,
    refund_amount: i128,
) -> Result<i128, RefundCapError>

refunded_so_far(env: Env, invoice_id: Symbol) -> i128

remaining_refundable(
    env: Env,
    invoice_id: Symbol,
    original_amount: i128,
) -> Result<i128, RefundCapError>
```

| Error variant | Code | Condition |
|---------------|------|-----------|
| `RefundCapError::InvalidOriginalAmount` | `1` | `original_amount <= 0`. |
| `RefundCapError::InvalidRefundAmount` | `2` | `refund_amount <= 0`. |
| `RefundCapError::RefundExceedsOriginalAmount` | `3` | `refunded_so_far + refund_amount > original_amount`. |
| `RefundCapError::OriginalAmountMismatch` | `4` | `original_amount` differs from the value pinned on the first refund for `invoice_id`. |
| `RefundCapError::ArithmeticOverflow` | `5` | `refunded_so_far + refund_amount` overflows `i128`. |

## Usage

```rust
use refund_cap_per_invoice::{
    RefundCapError, RefundCapPerInvoice, RefundCapPerInvoiceClient,
};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let contract_id = env.register(RefundCapPerInvoice, ());
let client = RefundCapPerInvoiceClient::new(&env, &contract_id);

let inv = symbol_short!("INV_001");
assert_eq!(client.refunded_so_far(&inv), 0);

// Two partial refunds totaling 1_000 stroops against a 1_000-stroop invoice:
assert_eq!(client.record_refund(&inv, &1_000, &400), 400);
assert_eq!(client.remaining_refundable(&inv, &1_000), 600);
assert_eq!(client.record_refund(&inv, &1_000, &600), 1_000);

// Any further refund is rejected and preserves the 1_000 total:
assert_eq!(
    client.try_record_refund(&inv, &1_000, &1),
    Err(Ok(RefundCapError::RefundExceedsOriginalAmount))
);
assert_eq!(client.refunded_so_far(&inv), 1_000);
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/refund_cap_per_invoice/Cargo.toml
cargo test --manifest-path contracts/refund_cap_per_invoice/Cargo.toml
cargo clippy --manifest-path contracts/refund_cap_per_invoice/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **`happy_path.rs`** — Single and multi-step partial refunds reaching the exact invoice cap plus `remaining_refundable` checks.
- **`edge_boundary.rs`** — Single-stroop (`1`) full refund, `i128::MAX` cap boundary, and `ArithmeticOverflow` protection.
- **`failure_cases.rs`** — Over-cap rejection without state mutation, zero/negative `original_amount` and `refund_amount`, and `OriginalAmountMismatch` detection.
- **`refund_scenarios.rs`** — Multi-invoice isolation confirming refunds on one `Symbol` never affect another invoice's cap or remaining balance.

This crate defines its own standalone `[workspace]` in `contracts/refund_cap_per_invoice/Cargo.toml` and is intentionally not added to `contracts/Cargo.toml`.

## Out of scope

- Wiring into Quittance's Next.js frontend, Express backend, or other contracts under `contracts/`.
- Token transfers or caller authorization policy (this crate isolates the cumulative refund accounting primitive).
- Testnet or mainnet deployment scripts.

## License

MIT.
