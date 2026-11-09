# `seller-tier-registry`

Standalone Soroban contract implementing an **admin-assigned seller tier registry**.

Assigns a fixed tier (`Bronze`, `Silver`, `Gold`) to each seller address; purely a storage-and-lookup primitive with default `Bronze` tier for unassigned sellers.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `set_tier` | `fn(Env, seller: Address, tier: Tier)` | Assign `tier` to `seller`. |
| `tier_of` | `fn(Env, seller: Address) -> Tier` | Return the assigned `Tier` for `seller` (defaults to `Tier::Bronze`). |
| `has_assigned_tier` | `fn(Env, seller: Address) -> bool` | Return `true` if `seller` has been explicitly assigned a tier. |
| `clear_tier` | `fn(Env, seller: Address)` | Reset `seller` back to default (`Tier::Bronze`). |

## Build & Test

```bash
cargo test --manifest-path contracts/seller_tier_registry/Cargo.toml
cargo clippy --manifest-path contracts/seller_tier_registry/Cargo.toml --all-targets -- -D warnings
```
