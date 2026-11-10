# Invoice Void Flag (`invoice_void_flag`)

Standalone Soroban contract primitive allowing a seller to void an unpaid invoice exactly once (`void_invoice`, `is_void`).

## Public API

- `register_invoice(env: Env, seller: Address, invoice_id: Symbol)`
- `mark_paid(env: Env, invoice_id: Symbol) -> Result<(), VoidFlagError>`
- `void_invoice(env: Env, seller: Address, invoice_id: Symbol) -> Result<VoidRecord, VoidFlagError>`
- `is_void(env: Env, invoice_id: Symbol) -> bool`
- `void_record(env: Env, invoice_id: Symbol) -> Option<VoidRecord>`

## Build & Test

```bash
cargo test --manifest-path contracts/invoice_void_flag/Cargo.toml
cargo clippy --manifest-path contracts/invoice_void_flag/Cargo.toml --all-targets -- -D warnings
```
