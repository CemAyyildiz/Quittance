# dispute-flag

A standalone Soroban contract that lets a payer dispute a recorded payment
during a defined window. An unresolved dispute blocks finalization for that
invoice until an authorized resolver clears it.

This crate does not connect to Quittance's frontend, backend, or other
contracts. It does not verify Stellar transactions itself: the resolver must
confirm payment off-chain before calling `record_payment` and must decide how
to settle a dispute before calling `resolve_dispute`. A future integration must
enforce those checks and consult `is_finalizable` before finalizing a payment.

## What it does

At deployment, pass a `resolver: Address` to the constructor. The resolver
records a confirmed payment with an invoice ID, payer, payment timestamp, and
dispute window. Only that payer can flag the payment, and only the resolver can
clear the flag. Records are kept in persistent Soroban storage by invoice ID.
An absent or archived record is never considered finalizable; restore archived
records before relying on their state.

## Public API

```rust
__constructor(env: Env, resolver: Address)
record_payment(env: Env, invoice_id: Symbol, payer: Address, paid_at: u64, window_secs: u64) -> Result<(), Error>
flag_dispute(env: Env, invoice_id: Symbol, payer: Address) -> Result<bool, Error>
resolve_dispute(env: Env, invoice_id: Symbol) -> Result<bool, Error>
is_finalizable(env: Env, invoice_id: Symbol) -> bool
```

`record_payment` and `resolve_dispute` require resolver authorization;
`flag_dispute` requires payer authorization and verifies that the payer matches
the recorded payment. Successful flag and resolution calls return `true`.
`is_finalizable` returns `false` for unknown invoices or unresolved disputes,
and `true` for recorded payments with no dispute or a resolved dispute.

The contract reads `env.ledger().timestamp()`; callers cannot supply `now`.
The dispute deadline is **inclusive**: a flag at `paid_at + window_secs` is
allowed, and one second later is rejected. A zero or overflowing window, a
future payment timestamp, duplicate recording, repeated flag, or repeated
resolution returns a typed error. Once resolved, the payment cannot be flagged
again. The contract never finalizes a payment itself.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/dispute_flag/Cargo.toml
cargo clippy --manifest-path contracts/dispute_flag/Cargo.toml --all-targets -- -D warnings
cargo build --manifest-path contracts/dispute_flag/Cargo.toml --target wasm32v1-none --release
```

The final command requires the `wasm32v1-none` Rust target. This crate has
its own `[workspace]` declaration and is not a member of `contracts/Cargo.toml`.
