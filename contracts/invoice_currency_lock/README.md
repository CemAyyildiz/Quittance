# invoice-currency-lock

Locks an invoice to one asset code and rejects any later attempt to change its currency.

This crate is a self-contained Soroban primitive. An invoice is bound to the asset it is
denominated in at creation time, and that binding can never be changed afterwards — a later
attempt to lock the same invoice to a different code fails and leaves the original lock in
place.

The crate is **not** wired into the frontend, backend, or any other contract in this repo. It
ships and is tested entirely on its own, matching how most existing crates under `contracts/`
are structured (standalone `Cargo.toml`, not a member of the root workspace).

## What it does

| Function | Signature | Meaning |
|----------|-----------|---------|
| `lock_currency` | `fn(Env, Symbol, Symbol) -> Result<(), CurrencyLockError>` | Lock an invoice to an asset code. |
| `assert_currency` | `fn(Env, Symbol, Symbol) -> bool` | Whether the invoice is locked to the given code. |
| `require_currency` | `fn(Env, Symbol, Symbol) -> Result<(), CurrencyLockError>` | Fail unless the invoice is locked to the given code. |
| `locked_currency` | `fn(Env, Symbol) -> Option<Symbol>` | Read the locked asset code, if any. |
| `is_locked` | `fn(Env, Symbol) -> bool` | Whether the invoice has a currency lock. |

The first argument is the invoice identifier, the second the asset code.

### Example

```rust
use invoice_currency_lock::{InvoiceCurrencyLock, InvoiceCurrencyLockClient};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
env.mock_all_auths();
let contract_id = env.register(InvoiceCurrencyLock, ());
let client = InvoiceCurrencyLockClient::new(&env, &contract_id);

let invoice = symbol_short!("INV1");
let usd = symbol_short!("USD");

client.lock_currency(&invoice, &usd);
assert!(client.assert_currency(&invoice, &usd));
assert!(!client.assert_currency(&invoice, &symbol_short!("EUR")));
```

## Rules

1. **One code per invoice** — an invoice is denominated in exactly one asset.
2. **The lock is permanent** — the stored code is never overwritten.
3. **Valid codes only** — the asset code must be 1–12 ASCII alphanumeric characters, matching
   Stellar's asset-code rules. Anything else is rejected before a lock is written, so an invoice
   can never end up locked to a code no asset could ever have.
4. **Retries are safe** — locking an invoice to the code it already holds succeeds without
   changing anything, so a retried transaction cannot break the invoice.

## Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `CurrencyLockError::InvalidAssetCode` | `1` | The asset code is not 1–12 alphanumeric characters. |
| `CurrencyLockError::CurrencyMismatch` | `2` | The invoice is already locked to a different asset code. |
| `CurrencyLockError::InvoiceNotLocked` | `3` | The invoice has no currency lock yet. |

Each variant carries a stable `#[repr(u32)]` discriminant, and `message()` returns a stable
English description for off-chain tooling.

## Layout

```
src/lib.rs        contract entry points
src/lock.rs       pure asset-code validation and matching logic
src/storage.rs    instance-storage accessors
src/types.rs      storage keys and error codes
tests/            happy path, edge/boundary, failure, and scenario suites
```

## Building and testing

This crate requires the [Soroban SDK](https://github.com/stellar/rs-soroban-sdk). Install Rust
from <https://rustup.rs> if missing, then:

```bash
cargo test --manifest-path contracts/invoice_currency_lock/Cargo.toml
cargo clippy --manifest-path contracts/invoice_currency_lock/Cargo.toml --all-targets -- -D warnings
```

The crate declares its own `[workspace]`, so it is deliberately **not** listed in
`contracts/Cargo.toml`'s workspace `members`. Building it therefore never disturbs the other
contracts in the repo.

## License

MIT — see `LICENSE` at the repository root.
