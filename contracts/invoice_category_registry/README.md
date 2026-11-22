# invoice-category-registry

A bounded invoice category registry: an admin defines a small fixed list of
category symbols, sellers tag their invoices from that list only, and tagging
with an unregistered category is rejected.

This crate is a **self-contained learning/utility contract** in the same family
as `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and
`contracts/auth_one_address`. It is not wired into the frontend, backend, or any
other contract in this repo. It ships and is tested entirely on its own, matching
how most existing crates under `contracts/` are structured (standalone
`Cargo.toml` with its own `[workspace]` table, not a member of the root
workspace).

## What it does

At deployment the constructor records an **admin**. Only that admin can add
categories, and the list is capped at **32** entries. Every new category must be
registered before any invoice can use it; the list lives in instance storage and
can never grow past the cap. Invoice tags live in their own persistent entries,
so the number of tagged invoices is unbounded while the category list stays
small.

| Step | Call | Result |
|------|------|--------|
| Register a category | `register_category(admin, travel)` | `Ok(())` |
| Check the list | `is_registered(travel)` | `true` |
| Tag an invoice | `set_invoice_category(inv_1, travel)` | `Ok(())` |
| Read the tag | `category_of(inv_1)` | `Some(travel)` |
| Tag with an unknown category | `set_invoice_category(inv_1, music)` | `Err(UnknownCategory)` |
| Read again | `category_of(inv_1)` | `Some(travel)` — unchanged |
| Re-register the same category | `register_category(admin, travel)` | `Ok(())` — no-op |
| Register a 33rd category | `register_category(admin, extra)` | `Err(RegistryFull)` |

Tagging is a **setter**: tagging the same invoice again with another registered
category replaces the old tag. A rejected tag (unregistered category) never
touches the stored value.

## Public API

```text
__constructor(env, admin: Address)
register_category(env, admin: Address, category: Symbol) -> Result<(), Error>
set_invoice_category(env, invoice_id: Symbol, category: Symbol) -> Result<(), Error>
category_of(env, invoice_id: Symbol) -> Option<Symbol>
is_registered(env, category: Symbol) -> bool
categories(env) -> Vec<Symbol>
```

| Item | Meaning |
|------|---------|
| `__constructor` | Records the admin allowed to register categories. |
| `register_category` | Adds a category to the bounded list. `admin` must be the stored admin **and** must authorize the call. Idempotent for existing categories. |
| `set_invoice_category` | Tags an invoice. Fails with `UnknownCategory` unless the category is registered; otherwise stores (or replaces) the tag. |
| `category_of` | Reads the tag for an invoice, or `None` when it is untagged. |
| `is_registered` | Whether a category is in the list. |
| `categories` | The registered categories, in registration order. |

The admin address is an explicit parameter of `register_category` so that a call
from anyone else fails with the typed `Error::NotAdmin` instead of a host-level
authorization trap; the stored admin must also sign the call.

### Bounds

| Bound | Value |
|-------|-------|
| Maximum categories | `MAX_CATEGORIES = 32` |
| Categories per contract instance | one registry |
| Tagged invoices | unbounded (one persistent entry per invoice) |
| Tag per invoice | exactly one |

Why 32: the registry is meant to be an admin-curated set, not a tag cloud. Keeping
the list small lets it live in instance storage with a hard upper bound instead
of growing without limit.

### Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `Error::NotAdmin` | `1` | The caller is not the admin recorded at deployment. |
| `Error::UnknownCategory` | `2` | The category is not registered. |
| `Error::RegistryFull` | `3` | The registry already holds `MAX_CATEGORIES` categories. |

Each variant carries a stable `#[repr(u32)]` discriminant, and `Error::message()`
returns a stable English description for off-chain tooling.

### Usage

```rust
use invoice_category_registry::{InvoiceCategoryRegistry, InvoiceCategoryRegistryClient};
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

let env = Env::default();
env.mock_all_auths();
let admin = Address::generate(&env);
let contract_id = env.register(InvoiceCategoryRegistry, (admin.clone(),));
let client = InvoiceCategoryRegistryClient::new(&env, &contract_id);

let travel = symbol_short!("travel");
let invoice = symbol_short!("INV1");

client.register_category(&admin, &travel);
client.set_invoice_category(&invoice, &travel);

assert!(client.is_registered(&travel));
assert_eq!(client.category_of(&invoice), Some(travel));
assert!(client.try_set_invoice_category(&invoice, &symbol_short!("music")).is_err());
```

Tagged invoices stay readable for the usual retention window: persistent entries
are bumped from a 30-day threshold out to 90 days on write and read. The
instance entry holding the admin and the category list is extended at
deployment.

## Layout

```
src/lib.rs        contract entry points and crate documentation
src/registry.rs   admin, category list, bounded cap
src/storage.rs    per-invoice tag storage with TTL bumps
src/types.rs      storage keys, Error codes, MAX_CATEGORIES
tests/common/     shared test setup
tests/            happy path, edge/boundary, failure, and capacity suites
```

## Tests

From the repository root:

```bash
cargo test --manifest-path contracts/invoice_category_registry/Cargo.toml
cargo clippy --manifest-path contracts/invoice_category_registry/Cargo.toml --all-targets -- -D warnings
```

Or from inside the crate:

```bash
cd contracts/invoice_category_registry
cargo test
cargo clippy --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/invoice_category_registry/Cargo.toml
```

The suites in `tests/` cover:

- **Happy path** — empty start, admin registration, ordered list, seller tagging,
  independent invoices, idempotent re-registration, filling the registry to the cap.
- **Edge and boundary** — single-character and 32-character `Symbol` ids, untagged
  invoices, re-tagging replacing the previous category, case-sensitive categories.
- **Failures** — unregistered categories are rejected, a rejected tag leaves the
  old tag in place, a category past the cap is rejected, non-admins are refused,
  an unsigned call is refused, stable error codes and messages.
- **Capacity** — every registered category can tag an invoice, a full registry
  still answers reads and accepts existing categories, an overflow category is
  never usable, and repeated rejected attempts never grow the list.

This crate declares its own `[workspace]`, so it is deliberately **not** listed
in `contracts/Cargo.toml`'s workspace `members`. Building it never disturbs the
other contracts in the repo.

## Out of scope

- Wiring into the Next.js frontend or the Express backend.
- Cross-contract calls to any other crate in this repo.
- Deployment scripts or testnet/mainnet deployment.
- Enforcing seller authorization on `set_invoice_category`, and hooking this
  primitive into Quittance's invoice flow — those belong to a separate, later
  integration.

## License

MIT — see `LICENSE` at the repository root.
