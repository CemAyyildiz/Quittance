# `invoice-void-flag`

Standalone Soroban contract implementing a **one-time invoice void flag**.

Lets a seller void their own unpaid invoice exactly once before it is paid or expired. Voiding an already-void, paid, or expired invoice—or attempting to void another seller's registered invoice—is rejected with a typed `Error`.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `void_invoice` | `fn(Env, seller: Address, invoice_id: Symbol) -> Result<(), Error>` | Void an unpaid, unexpired `invoice_id` on behalf of `seller` exactly once. |
| `is_void` | `fn(Env, invoice_id: Symbol) -> bool` | Return `true` if `invoice_id` has been voided. |
| `register_invoice` | `fn(Env, seller: Address, invoice_id: Symbol) -> Result<(), Error>` | Optionally bind `invoice_id` to `seller` ahead of time so only `seller` can void it. |
| `mark_paid` | `fn(Env, invoice_id: Symbol) -> Result<(), Error>` | Mark an unvoided invoice as paid so it can no longer be voided. |
| `mark_expired` | `fn(Env, invoice_id: Symbol) -> Result<(), Error>` | Mark an unvoided invoice as expired so it can no longer be voided. |

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_void_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_void_flag/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
