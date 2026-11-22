# invoice-amount-history

Append-only log of invoice amount adjustments for Quittance on Stellar.

This crate records every amount change made to an invoice: the amount before
the adjustment, the amount after it, and the ledger sequence in which the
adjustment was made. Entries are never updated or deleted, so the full trail of
increases and decreases can be replayed later.

It is intentionally separate from the invoice status history
(`contracts/invoice_status_history`) and from the Quittance invoice/payment
flow. Nothing in `frontend/`, `backend/`, or another contract calls it. This
crate is **not** wired into the MVP demos; it is a standalone Soroban contract
primitive.

## What it does

Each invoice `Symbol` has an independent, ordered history of `AmountChange`
records:

| Field        | Type   | Notes                                                    |
|--------------|--------|----------------------------------------------------------|
| `old_amount` | `i128` | Invoice amount before the adjustment, in stroops.        |
| `new_amount` | `i128` | Invoice amount after the adjustment, in stroops.         |
| `ledger`     | `u32`  | Ledger sequence that closed the adjustment.              |

`i128` matches the Soroban SDK representation of Stellar amounts as signed
128-bit integers. `ledger` is supplied by the caller rather than read from
`env.ledger().sequence()` because the log is a pure record: an adjustment may
be reported after the ledger in which it was agreed, and this contract does not
require a token transfer in the same invocation.

The contract enforces only what keeps the log meaningful:

- an adjustment must change the amount, so `old_amount != new_amount`;
- invoice amounts cannot be negative (`0` is allowed);
- `ledger` must be greater than zero, because ledger sequence zero does not
  exist.

This is a log, not a policy engine. It does not check whether the caller is
allowed to adjust the invoice, and it does not require `old_amount` to equal the
previous entry's `new_amount`; continuity belongs to the invoice/payment flow
that would own the invoice. There is no update or delete method.

## Public API

```rust
record_adjustment(
    env: Env,
    invoice_id: Symbol,
    old_amount: i128,
    new_amount: i128,
    ledger: u32,
) -> Result<(), Error>

history_for(env: Env, invoice_id: Symbol) -> Vec<AmountChange>
```

`record_adjustment` appends one entry and returns `Error::UnchangedAmount`,
`Error::NegativeAmount`, or `Error::InvalidLedger` when the input is rejected.
`history_for` returns the entries oldest first, or an empty vector for an
invoice that has no adjustments; it never errors.

Histories live in persistent Soroban storage keyed by `invoice_id`. Their TTL is
extended on every read and write. Like all Soroban storage, an inactive history
can become archived and must be restored before it can be read; this contract
does not promise permanent availability without storage maintenance.

## Usage

```rust
use invoice_amount_history::{
    AmountChange, InvoiceAmountHistory, InvoiceAmountHistoryClient,
};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let contract_id = env.register(InvoiceAmountHistory, ());
let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
let invoice = symbol_short!("INV1");

// Invoice started at 100 XLM and was adjusted up, then down.
client.record_adjustment(&invoice, &1_000_000_000, &1_500_000_000, &42);
client.record_adjustment(&invoice, &1_500_000_000, &1_200_000_000, &57);

let history = client.history_for(&invoice);
assert_eq!(history.len(), 2);
assert_eq!(
    history.get(0),
    Some(AmountChange {
        old_amount: 1_000_000_000,
        new_amount: 1_500_000_000,
        ledger: 42,
    })
);
```

## Build and test

From the repository root:

```sh
cargo build --manifest-path contracts/invoice_amount_history/Cargo.toml
cargo test --manifest-path contracts/invoice_amount_history/Cargo.toml
cargo clippy --manifest-path contracts/invoice_amount_history/Cargo.toml --all-targets -- -D warnings
```

Or from this directory:

```sh
cargo test
cargo clippy --all-targets -- -D warnings
```

The crate has its own Cargo workspace (`[workspace]` in `Cargo.toml`) and is not
listed in `contracts/Cargo.toml`'s workspace members, matching most standalone
crates under `contracts/`.

## Tests

The test modules in `src/tests/` cover:

- **Happy path** (`happy_path.rs`) - adjustments are appended in call order and
  returned with their original amounts and ledger; an empty log reads as an
  empty vector; a zero-amount invoice can grow.
- **Boundaries** (`boundaries.rs`) - unknown invoices, zero amounts on either
  side, `i128::MAX`, `u32::MAX` ledger, and a maximum-length (32 byte) invoice
  `Symbol`.
- **Errors** (`errors.rs`) - unchanged amounts, negative old/new amounts, and
  ledger zero are rejected without mutating existing history, including error
  precedence.
- **Adjustment trail** (`adjustment_trail.rs`) - per-invoice independence,
  ledger preservation, and the telescoping property: the sum of
  `new_amount - old_amount` over the log equals the net change from the first
  `old_amount` to the last `new_amount`.

## Out of scope

Deployment scripts, testnet/mainnet deployment, cross-contract calls, access
control, and integration with Quittance's actual invoice/payment flow are
separate work. This issue ships the standalone primitive only.

## License

MIT.
