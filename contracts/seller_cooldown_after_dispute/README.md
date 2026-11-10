# Seller Cooldown After Dispute (`seller_cooldown_after_dispute`)

Standalone Soroban contract primitive that blocks a seller from creating new invoices for a configurable number of ledgers after a dispute is flagged, then automatically unlocks without manual reset.

## Public API

- `flag_dispute(env: Env, seller: Address, ledger: u32)`
- `can_create_invoice(env: Env, seller: Address, current_ledger: u32, cooldown: u32) -> bool`
- `require_can_create(env: Env, seller: Address, current_ledger: u32, cooldown: u32) -> Result<(), CooldownError>`
- `last_dispute_ledger(env: Env, seller: Address) -> Option<u32>`
- `remaining_cooldown(env: Env, seller: Address, current_ledger: u32, cooldown: u32) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/seller_cooldown_after_dispute/Cargo.toml
cargo clippy --manifest-path contracts/seller_cooldown_after_dispute/Cargo.toml --all-targets -- -D warnings
```
