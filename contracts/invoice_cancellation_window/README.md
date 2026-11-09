# `invoice-cancellation-window`

Standalone Soroban contract implementing a **buyer-side invoice cancellation window**.

Allows a payer-initiated cancellation of an unpaid invoice only within a fixed number of ledgers (`window`) after its creation (`created_at`). Any cancellation attempt after the window closes, before creation, or on an already cancelled/paid invoice is rejected with a typed `Error`.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `cancel` | `fn(Env, payer: Address, invoice_id: Symbol, created_at: u32, current_ledger: u32, window: u32) -> Result<(), Error>` | Cancel an unpaid invoice if `created_at <= current_ledger <= created_at + window`. |
| `is_cancelled` | `fn(Env, invoice_id: Symbol) -> bool` | Return `true` if `invoice_id` has been cancelled. |
| `record_of` | `fn(Env, invoice_id: Symbol) -> Option<CancellationRecord>` | Read back the stored cancellation metadata for `invoice_id`. |
| `mark_paid` | `fn(Env, invoice_id: Symbol) -> Result<(), Error>` | Mark an uncancelled invoice as paid so it can no longer be cancelled. |
| `can_cancel_at` | `fn(created_at: u32, current_ledger: u32, window: u32) -> Result<(), Error>` | Pure window check helper. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_cancellation_window/Cargo.toml
cargo clippy --manifest-path contracts/invoice_cancellation_window/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
