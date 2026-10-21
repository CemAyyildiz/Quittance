# address-denylist

Admin-managed denylist of Stellar addresses.

The constructor stores one admin. Only that admin can deny or allow an
address, and the call must be authorized. A denied address is blocked both as
an invoice issuer and as a payer. The admin cannot deny their own address.

This crate is standalone. It is not a member of the contracts workspace and it
is not called by the Quittance frontend or backend.

## Public API

```text
__constructor(env, admin: Address)
deny(env, admin: Address, who: Address)
allow(env, admin: Address, who: Address)
is_denied(env, who: Address) -> bool
role_allowed(env, who: Address, role: Role) -> bool
```

`Role` is `Issuer` or `Payer`. Both read the same list.

## Build and test

From the repository root:

```bash
cargo test --manifest-path contracts/address_denylist/Cargo.toml
cargo clippy --manifest-path contracts/address_denylist/Cargo.toml --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/address_denylist/Cargo.toml
```
