# Seller Blacklist Registry (`seller_blacklist_registry`)

Standalone Soroban contract primitive managing an admin seller blacklist (`blacklist`, `unblacklist`, `is_allowed`).

## Public API

- `initialize(env: Env, admin: Address) -> Result<(), BlacklistError>`
- `blacklist(env: Env, seller: Address)`
- `unblacklist(env: Env, seller: Address)`
- `is_allowed(env: Env, seller: Address) -> bool`
- `require_allowed(env: Env, seller: Address) -> Result<(), BlacklistError>`
- `blacklisted_count(env: Env) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/seller_blacklist_registry/Cargo.toml
cargo clippy --manifest-path contracts/seller_blacklist_registry/Cargo.toml --all-targets -- -D warnings
```
