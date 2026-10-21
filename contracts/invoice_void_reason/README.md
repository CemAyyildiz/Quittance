# invoice-void-reason

Lets an issuer void an invoice with a reason from a fixed set and lock it
against further payment.

The first authorized void is stored. A second void returns false and does not
replace the reason. `can_pay` is false after that lock.

This crate is standalone. It is not a member of the contracts workspace and it
is not called by the Quittance frontend or backend.

## Public API

```text
void(env, issuer: Address, invoice_id: Symbol, reason: VoidReason) -> bool
is_voided(env, invoice_id: Symbol) -> bool
reason_of(env, invoice_id: Symbol) -> Option<VoidRecord>
can_pay(env, invoice_id: Symbol) -> bool
```

`issuer` must authorize `void`. Reasons are `Duplicate`, `Cancelled`, `Fraud`,
and `Other`.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/invoice_void_reason/Cargo.toml
cargo clippy --manifest-path contracts/invoice_void_reason/Cargo.toml --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/invoice_void_reason/Cargo.toml
```
