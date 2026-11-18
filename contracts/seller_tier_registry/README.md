# Quittance - Seller Tier Registry Contract

Standalone Soroban contract crate implementing an admin-assigned seller tier registry.

## Concept

Enables an authorized administrator to assign fixed tiers (`Bronze`, `Silver`, `Gold`) to seller addresses. Functions as a lookup primitive without modifying external contracts or dependencies.

## Public Interface

```rust
pub fn initialize(env: Env, admin: Address) -> Result<(), RegistryError>;
pub fn set_tier(env: Env, seller: Address, tier: Tier) -> Result<(), RegistryError>;
pub fn tier_of(env: Env, seller: Address) -> Option<Tier>;
pub fn has_tier(env: Env, seller: Address) -> bool;
pub fn remove_tier(env: Env, seller: Address) -> Result<(), RegistryError>;
pub fn get_admin(env: Env) -> Result<Address, RegistryError>;
```

## Building and Testing

```bash
cargo build --target wasm32-unknown-unknown --release
cargo test
cargo clippy --all-targets -- -D warnings
```
