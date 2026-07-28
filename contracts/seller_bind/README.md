# contracts/seller-bind

A small, self-contained Soroban smart contract that asserts a provided
Stellar seller `Address` matches an expected binding stored on the
contract instance.

This crate is additive only. It does not touch the Quittance Next.js
frontend or Express MVP backend and is not wired into them in this PR.

## Why

Cash-handling products sometimes need a single on-chain source of truth
for "who is the seller" of an invoice. `seller-bind` plays that role by
storing one binding at deployment time and exposing a tiny, easy-to-call
helper that compares any incoming seller address against it.

## Public API

| Function | Purpose |
|----------|---------|
| `init(seller)` | Set the binding (overwrites any previous). |
| `check_seller(provided)` | Return `Ok(())` on match, `Err(Error::SellerMismatch)` on mismatch, `Err(Error::NotInitialized)` before `init`. |
| `get_seller()` | View the bound address. |
| `set_seller(seller)` | Replace the binding; rejected if the contract was never initialized. |

## Errors

`#[contracterror]` with `#[repr(u32)]`:

| Variant | Code | Cause |
|---------|------|-------|
| `NotInitialized` | `1` | A method that needs the binding was called before `init`. |
| `SellerMismatch` | `2` | `check_seller` was called with an address that does not match the binding. |

Codes are stable so off-chain consumers can match on the integer.

## Storage

The binding is kept on the contract instance under a single
`DataKey::Seller` entry so it follows the contract address.

## Build and test

From the crate directory:

```sh
cargo test
cargo build --target wasm32-unknown-unknown --release
```

## Scope guard

This crate owns only the files inside `contracts/seller_bind/`. It does
not import into the Next.js or Express MVP demos in this PR. Any
auth-required variant (e.g. requiring the bound seller's signature on
`set_seller`) is out of scope here — the contract compares addresses
only and does not provide an authorization framework.

## License

MIT — see `LICENSE` at the repository root.
