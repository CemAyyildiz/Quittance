# issuer-rotation

A standalone Soroban contract that lets an invoice issuer transfer issuer rights
to one new address exactly once. It stores the issuer per invoice, requires
authorization from the current issuer, and prevents repeat rotations.

## API

- `initialize(invoice_id: Symbol, issuer: Address) -> Result<(), Error>` binds
  an invoice to its initial issuer after requiring that issuer's authorization.
  An invoice can only be initialized once.
- `rotate_issuer(invoice_id: Symbol, current: Address, new_issuer: Address) ->
  Result<(), Error>` transfers the issuer after verifying authorization and
  stored ownership. The invoice can only be rotated once.
- `issuer(invoice_id: Symbol) -> Option<Address>` returns the current issuer,
  or `None` if the invoice has not been initialized.

## Build and test

```sh
cargo test --manifest-path contracts/issuer_rotation/Cargo.toml
cargo clippy --manifest-path contracts/issuer_rotation/Cargo.toml --all-targets -- -D warnings
```

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.