# Seller Payout Address Binding (`seller_payout_address_binding`)

Standalone Soroban contract primitive binding a seller address to its designated payout address with a rebind cooldown period.

## Public API

- `bind(env: Env, seller: Address, payout_address: Address, ledger: u32) -> Result<PayoutBinding, PayoutBindingError>`
- `payout_address_of(env: Env, seller: Address) -> Option<Address>`
- `binding_of(env: Env, seller: Address) -> Option<PayoutBinding>`
- `set_cooldown_ledgers(env: Env, cooldown: u32)`
- `cooldown_ledgers(env: Env) -> u32`

## Build & Test

```bash
cargo test --manifest-path contracts/seller_payout_address_binding/Cargo.toml
cargo clippy --manifest-path contracts/seller_payout_address_binding/Cargo.toml --all-targets -- -D warnings
```
