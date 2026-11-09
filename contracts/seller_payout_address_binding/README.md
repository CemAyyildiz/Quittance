# `seller-payout-address-binding`

Standalone Soroban contract implementing **seller payout address binding with cooldown**.

Binds a `seller` address to the Stellar `payout_address` that should receive its payouts. Rebinding to a new payout address is allowed only after a cooldown period (`DEFAULT_REBIND_COOLDOWN_LEDGERS = 100`, or configurable via `set_cooldown` / `bind_with_cooldown`) has elapsed since the previous bind.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `bind` | `fn(Env, seller: Address, payout_address: Address, ledger: u32) -> Result<(), Error>` | Bind `seller` to `payout_address` at `ledger`, enforcing the rebind cooldown on changes. |
| `payout_address_of` | `fn(Env, seller: Address) -> Option<Address>` | Read the currently bound payout address for `seller`, if any. |
| `binding_of` | `fn(Env, seller: Address) -> Option<PayoutBinding>` | Read full binding metadata (`payout_address`, `bound_at_ledger`). |
| `set_cooldown` | `fn(Env, cooldown_ledgers: u32)` | Configure the contract-wide rebind cooldown duration in ledgers. |
| `cooldown` | `fn(Env) -> u32` | Return the active rebind cooldown duration (defaults to `100` ledgers). |

## Build & Test

```bash
cargo test --manifest-path contracts/seller_payout_address_binding/Cargo.toml
cargo clippy --manifest-path contracts/seller_payout_address_binding/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
