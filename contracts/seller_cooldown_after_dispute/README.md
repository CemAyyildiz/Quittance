# `seller-cooldown-after-dispute`

Standalone Soroban contract enforcing a **seller invoice-creation cooldown after a dispute**.

Once a dispute is flagged against a seller at a given ledger, that seller is blocked from creating new invoices for a fixed number of ledgers (`cooldown`), then automatically allowed to create invoices again once the cooldown window elapses—without requiring any manual reset transaction.

This crate is intentionally self-contained in the same family as `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and `contracts/auth_one_address`. It is not a member of the root workspace and is not wired into the Quittance frontend or backend.

## Public API

| Function | Signature | Description |
|----------|-----------|-------------|
| `flag_dispute` | `fn(Env, seller: Address, ledger: u32)` | Flag a dispute against `seller` at `ledger` (monotonic: retains the highest dispute ledger). |
| `can_create_invoice` | `fn(Env, seller: Address, current_ledger: u32, cooldown: u32) -> bool` | Return `true` if `seller` has no active dispute cooldown at `current_ledger`. |
| `flag_dispute_checked` | `fn(Env, seller: Address, ledger: u32) -> Result<u32, CooldownError>` | Flag a dispute, returning `Err(CooldownError::LedgerRegression)` if `ledger` is older than the stored dispute ledger. |
| `last_dispute_ledger` | `fn(Env, seller: Address) -> Option<u32>` | Read the most recent dispute ledger recorded for `seller`. |
| `remaining_cooldown` | `fn(Env, seller: Address, current_ledger: u32, cooldown: u32) -> u32` | Return the number of ledgers remaining in `seller`'s cooldown (`0` when allowed). |
| `status` | `fn(Env, seller: Address, current_ledger: u32, cooldown: u32) -> CooldownStatus` | Return combined `can_create` + `remaining_ledgers` snapshot. |

## Cooldown Semantics

- **No dispute on record:** `can_create_invoice` returns `true`.
- **Zero cooldown (`cooldown == 0`):** `can_create_invoice` always returns `true`.
- **During cooldown (`current_ledger < dispute_ledger + cooldown`):** `can_create_invoice` returns `false`.
- **At or after unlock (`current_ledger >= dispute_ledger + cooldown`):** `can_create_invoice` automatically returns `true` without any state reset.
- **Overflow protection:** If `dispute_ledger + cooldown` would overflow `u32::MAX`, the cooldown remains active for all `u32` ledgers rather than wrapping around.

## Build & Test

```bash
cargo test --manifest-path contracts/seller_cooldown_after_dispute/Cargo.toml
cargo clippy --manifest-path contracts/seller_cooldown_after_dispute/Cargo.toml --all-targets -- -D warnings
```

## License

MIT — see `LICENSE` at the repository root.
