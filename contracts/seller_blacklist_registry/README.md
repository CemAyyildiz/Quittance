# `seller-blacklist-registry`

Standalone Soroban contract implementing an **admin seller blacklist**.

Maintains a blacklist of seller addresses so invoice-creation flows can call `is_allowed(seller)` before permitting a seller to issue new invoices. Unknown sellers are allowed by default (`is_allowed == true`), blacklisted sellers return `is_allowed == false`, and `unblacklist(seller)` restores permission.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `blacklist` | `fn(Env, seller: Address)` | Add `seller` to the blacklist (idempotent). |
| `unblacklist` | `fn(Env, seller: Address)` | Remove `seller` from the blacklist (idempotent). |
| `is_allowed` | `fn(Env, seller: Address) -> bool` | Return `true` when `seller` is **not** blacklisted. |
| `is_blacklisted` | `fn(Env, seller: Address) -> bool` | Return `true` when `seller` is currently blacklisted. |
| `init_admin` | `fn(Env, admin: Address) -> Result<(), BlacklistError>` | Optional one-time admin configuration; once set, `blacklist`/`unblacklist` require `admin.require_auth()`. |

## Build & Test

```bash
cargo test --manifest-path contracts/seller_blacklist_registry/Cargo.toml
cargo clippy --manifest-path contracts/seller_blacklist_registry/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
