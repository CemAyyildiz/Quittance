# Seller Tier Registry (`seller_tier_registry`)

Standalone Soroban contract primitive for assigning and querying seller tiers (`Bronze`, `Silver`, `Gold`).

## Public API

- `initialize(env: Env, admin: Address) -> Result<(), SellerTierError>`
- `set_tier(env: Env, seller: Address, tier: Tier) -> Result<(), SellerTierError>`
- `tier_of(env: Env, seller: Address) -> Tier`
- `has_explicit_tier(env: Env, seller: Address) -> bool`
- `remove_tier(env: Env, seller: Address) -> Result<(), SellerTierError>`
- `seller_meets_tier(env: Env, seller: Address, minimum: Tier) -> bool`
- `admin(env: Env) -> Result<Address, SellerTierError>`

## Build & Test

```bash
cargo test --manifest-path contracts/seller_tier_registry/Cargo.toml
cargo clippy --manifest-path contracts/seller_tier_registry/Cargo.toml --all-targets -- -D warnings
```
