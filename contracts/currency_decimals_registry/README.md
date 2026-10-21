# currency-decimals-registry

An admin-managed Soroban registry that maps currency codes to decimal places.
It is a standalone utility contract; Quittance's invoice and payment flow does
not call it.

## What it does

The deployment constructor fixes one administrator. That address must authorize
every update. Decimal values range from `0` to `18`, inclusive. A code that has
never been registered returns the documented fallback of **7** decimal places,
which matches Stellar's base-unit precision. An explicit entry of `7` and an
unknown code have the same read result.

Codes are `Symbol` values and are compared exactly, including case. The
registry does not validate issuer identity or assert that a code represents a
real Stellar asset. Different issuers with the same code share one entry;
callers must account for that when using this utility.

## Public API

```rust
__constructor(env: Env, admin: Address)
set_decimals(env: Env, admin: Address, code: Symbol, decimals: u32)
    -> Result<(), RegistryError>
decimals_of(env: Env, code: Symbol) -> u32
```

`set_decimals` rejects an address other than the constructor's administrator
with `NotAdmin`, requires that administrator's Soroban authorization, and
rejects values above `18` with `InvalidDecimals`. Reads need no authorization.
Per-code values use persistent storage; the administrator uses instance
storage. Normal Soroban storage TTL and archival rules apply, so a caller must
restore archived entries before relying on an old value.

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/currency_decimals_registry/Cargo.toml
cargo test --manifest-path contracts/currency_decimals_registry/Cargo.toml
cargo clippy --manifest-path contracts/currency_decimals_registry/Cargo.toml --all-targets -- -D warnings
```

The four integration test files cover writes and updates, the `0` and `18`
boundaries, rejected updates and authorization, and fallback plus case-sensitive
code lookup. This crate has its own Cargo workspace and is not a member of
`contracts/Cargo.toml`.

## Out of scope

Deployment scripts, cross-contract calls, and Quittance frontend or backend
integration are separate work.

## License

MIT.
