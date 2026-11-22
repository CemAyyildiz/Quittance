# invoice-grace-fee-waiver

Standalone Soroban contract: one-time late-fee waiver per invoice.

## Purpose

Lets an admin grant a single, non-reversible waiver on an invoice id that
downstream late-fee logic should treat as "do not charge", consuming the
waiver on use.

Each invoice's waiver moves through a small state machine:

```text
(no record) --grant_waiver--> Granted --consume_waiver--> Consumed
```

`Consumed` is terminal. `grant_waiver` only succeeds when no record exists
for the invoice yet; re-granting an outstanding or consumed waiver returns
`false` and never re-arms it. `consume_waiver` returns `true` exactly once.

This crate is a self-contained learning/utility contract in the same family
as the other standalone `contracts/*` crates. It is **not** wired into the
frontend, backend, or any other contract in this repo.

## Public API

| Function                                   | Returns              | Purpose                                                     |
|--------------------------------------------|----------------------|-------------------------------------------------------------|
| `grant_waiver(admin, invoice_id)`          | `Result<bool, Error>`| Grant the waiver (admin-only). `true` when newly granted.  |
| `has_waiver(invoice_id)`                   | `bool`               | `true` while an outstanding (unused) waiver exists.         |
| `consume_waiver(invoice_id)`               | `bool`               | Consume permanently; `true` only the first time.            |
| `admin()`                                  | `Address`            | Read back the stored admin (fixed at deploy).               |

The admin is fixed in `__constructor` and cannot be reset. Admin-gated calls
require that address's authorization.

## Semantics

- An invoice with no record: `has_waiver` is `false`, `consume_waiver`
  returns `false`.
- Granted but unused: `has_waiver` is `true`; `consume_waiver` transitions to
  `Consumed` and returns `true`.
- Consumed: `has_waiver` is `false`, `consume_waiver` returns `false`, and
  `grant_waiver` returns `false` — the waiver is gone for good.
- Waivers are per invoice id and fully independent of each other.

## Errors

`Error` carries a stable `#[repr(u32)]` discriminant:

| Variant         | Code | Cause                                       |
|-----------------|------|---------------------------------------------|
| `NotAuthorised` | 1    | Caller did not match the stored admin       |

## Build and test

```sh
cargo test --manifest-path contracts/invoice_grace_fee_waiver/Cargo.toml
cargo clippy --manifest-path contracts/invoice_grace_fee_waiver/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.

## License

MIT
