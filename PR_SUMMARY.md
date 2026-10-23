# PR: Add four standalone Soroban contracts — invoice rate summary, ledger window guard, seller currency allowlist, invoice settlement-currency tag

Closes #910
Closes #823
Closes #836
Closes #882

## Summary

This PR adds **four new, fully standalone Soroban contract crates** under `contracts/`, one per issue. Each crate is a self-contained learning/utility primitive in the same family as the existing `contracts/*` crates (e.g. `quittance_receipt_hash`, `destination_guard`, `auth_one_address`, `invoice_currency_lock`). All four ship and are tested entirely on their own:

- no crate is added to the `contracts/Cargo.toml` workspace members list (each manifest carries its own empty `[workspace]` table, like most existing `contracts/*` crates),
- no cross-contract calls, no deployment scripts, no wiring into Quittance's invoice/payment flow,
- **45 files added, all inside the four new crate directories — nothing outside them was created or modified.**

| Issue | Crate | Concept |
|-------|-------|---------|
| #910 | `contracts/seller_invoice_rate_summary/` | Rolling invoice-creation rate summary (read-only counting over a caller-specified ledger window) |
| #823 | `contracts/ledger_window_guard/` | Generic ledger timestamp window guard (`is ts within [start, end]?`, overflow-safe) |
| #836 | `contracts/seller_currency_allowlist/` | Per-seller allowlist of accepted asset codes for new invoices |
| #882 | `contracts/multi_currency_invoice_tag/` | Invoice settlement-currency tag + pre-transfer validation check |

**119 tests pass; `cargo clippy --all-targets -- -D warnings` is clean for all four crates; all files are `rustfmt`-clean.**

---

## Issue #910 — `contracts/seller_invoice_rate_summary/`

A read-only summary primitive: given a seller's recorded invoice-creation ledger numbers, reports how many were created within a caller-specified recent ledger window. The reporting counterpart to rate-limiting primitives — **no storage, no rejection behavior of its own**.

### Files added (11)

| Path | Description |
|------|-------------|
| `contracts/seller_invoice_rate_summary/Cargo.toml` | Package manifest with standalone `[workspace]` table |
| `contracts/seller_invoice_rate_summary/.gitignore` | Standard Rust ignores (mirrors sibling crates) |
| `contracts/seller_invoice_rate_summary/README.md` | Concept, window semantics, API signatures, build/test instructions |
| `contracts/seller_invoice_rate_summary/src/lib.rs` | Contract entry points + doc examples |
| `contracts/seller_invoice_rate_summary/src/logic.rs` | Pure window arithmetic: `count_in_recent_window`, `is_recent`, `window_start` |
| `contracts/seller_invoice_rate_summary/src/types.rs` | `RateSummary` snapshot type (`count`, `current_ledger`, `window`, `window_start()`, `is_empty()`) |
| `contracts/seller_invoice_rate_summary/tests/common/mod.rs` | Shared setup + `Vec<u32>` slice helper |
| `contracts/seller_invoice_rate_summary/tests/happy_path.rs` | 7 tests — in-window counting, contract/free-fn agreement |
| `contracts/seller_invoice_rate_summary/tests/edge_boundary.rs` | 9 tests — exact window boundary, `window ∈ {0, 1, u32::MAX}`, `u32::MAX` ledgers, saturation |
| `contracts/seller_invoice_rate_summary/tests/failure_cases.rs` | 8 tests — empty list, zero window, future-dated entries, duplicate floods, unsorted input |
| `contracts/seller_invoice_rate_summary/tests/scenarios.rs` | 4 tests — rise-and-decay sliding window, two sellers independent, order-independence, bursty-day report |

### Public API

```rust
// Contract entry points (Soroban).
pub fn count_in_recent_window(env: Env, creation_ledgers: Vec<u32>, current_ledger: u32, window: u32) -> u32
pub fn summarize(env: Env, creation_ledgers: Vec<u32>, current_ledger: u32, window: u32) -> RateSummary

// Free functions — identical logic off-chain, over any u32 iterator.
pub fn count_in_recent_window<I: IntoIterator<Item = u32>>(creation_ledgers: I, current_ledger: u32, window: u32) -> u32
pub fn is_recent(ledger: u32, current_ledger: u32, window: u32) -> bool
pub fn window_start(current_ledger: u32, window: u32) -> u32

// Summary snapshot.
pub struct RateSummary { pub count: u32, pub current_ledger: u32, pub window: u32 }
```

### Semantics (documented in README + rustdoc)

- The window covers the `window` most recent ledgers, **ending at and including `current_ledger`** (`window == 10` at ledger `100` → ledgers `91..=100`).
- An entry **exactly `window` ledgers old is excluded**; one ledger newer is included.
- Entries above `current_ledger` (future-dated) are **ignored**, not counted; `window == 0` counts `0`.
- Duplicates count separately, unsorted input changes nothing; the count accumulates with `u32::saturating_add` so it cannot wrap.

### Tests: 30 pass (28 integration + 2 doc)

---

## Issue #823 — `contracts/ledger_window_guard/`

A generic, reusable "is this timestamp within `[start, end]`?" guard with overflow-safe arithmetic: it only ever compares integers, never subtracts them, so no input can wrap, underflow, or panic. Inverted windows (`start > end`) match nothing.

### Files added (11)

| Path | Description |
|------|-------------|
| `contracts/ledger_window_guard/Cargo.toml` | Package manifest with standalone `[workspace]` table |
| `contracts/ledger_window_guard/.gitignore` | Standard Rust ignores |
| `contracts/ledger_window_guard/README.md` | Concept, rules, API signatures, build/test instructions |
| `contracts/ledger_window_guard/src/lib.rs` | Contract entry point + doc examples |
| `contracts/ledger_window_guard/src/window.rs` | Pure logic: `in_window` (inclusive), `window_len` (checked, `None` when inverted) |
| `contracts/ledger_window_guard/src/types.rs` | `Window` value type: `new` / `contains` / `span` / `is_inverted` |
| `contracts/ledger_window_guard/tests/common/mod.rs` | Shared setup |
| `contracts/ledger_window_guard/tests/happy_path.rs` | 7 tests — inside/outside, inclusive bounds, contract/free-fn agreement |
| `contracts/ledger_window_guard/tests/edge_boundary.rs` | 10 tests — exact bounds, single-instant window, zero window, `u64` extremes |
| `contracts/ledger_window_guard/tests/failure_cases.rs` | 8 tests — inverted windows, just-outside timestamps, no overflow ever |
| `contracts/ledger_window_guard/tests/scenarios.rs` | 4 tests — retry grace window, hourly buckets, moving window, overlapping windows |

### Public API

```rust
pub fn in_window(env: Env, ts: u64, start: u64, end: u64) -> bool  // contract
pub fn in_window(ts: u64, start: u64, end: u64) -> bool            // free function
pub fn window_len(start: u64, end: u64) -> Option<u64>             // None when inverted
pub struct Window { pub start: u64, pub end: u64 }                 // contains / span / is_inverted
```

### Semantics (documented in README + rustdoc)

1. **Both bounds inclusive** — `ts == start` and `ts == end` are inside.
2. **Inverted windows are empty** — `start > end` → `false` for every `ts`; `window_len` returns `None` instead of underflowing (no naive `end - start`).
3. **Read-only** — no storage, no config, no authorization; deterministic output.

### Tests: 33 pass (29 integration + 4 doc)

---

## Issue #836 — `contracts/seller_currency_allowlist/`

A per-seller allowlist of accepted asset codes for new invoices. Each seller opts in to the currencies they accept (`seller.require_auth()`), and anyone can check membership read-only before creating or paying an invoice.

### Files added (12)

| Path | Description |
|------|-------------|
| `contracts/seller_currency_allowlist/Cargo.toml` | Package manifest with standalone `[workspace]` table |
| `contracts/seller_currency_allowlist/.gitignore` | Standard Rust ignores |
| `contracts/seller_currency_allowlist/README.md` | Concept, rules, API signatures, build/test instructions |
| `contracts/seller_currency_allowlist/src/lib.rs` | Contract entry points + doc examples |
| `contracts/seller_currency_allowlist/src/types.rs` | `DataKey::Allowed(Address)`, `AllowlistError` (`#[repr(u32)]`, stable message) |
| `contracts/seller_currency_allowlist/src/validate.rs` | `validate_asset_code` (1–12 ASCII alphanumeric) + `MAX_ASSET_CODE_LEN` |
| `contracts/seller_currency_allowlist/src/storage.rs` | Persistent per-seller list: load / check / idempotent append |
| `contracts/seller_currency_allowlist/tests/common/mod.rs` | Shared setup (auth mocked) + seller-address helper |
| `contracts/seller_currency_allowlist/tests/happy_path.rs` | 7 tests — opt-in, queries, multiple codes, idempotency, seller isolation |
| `contracts/seller_currency_allowlist/tests/edge_boundary.rs` | 8 tests — 1-char and exactly-12-char codes, 12-vs-13 boundary, case sensitivity, digits |
| `contracts/seller_currency_allowlist/tests/failure_cases.rs` | 9 tests — invalid codes → `InvalidAssetCode`, list untouched, auth required, stable discriminant |
| `contracts/seller_currency_allowlist/tests/scenarios.rs` | 5 tests — currency menu, large allowlist, churn isolation, invalid-then-valid, empty-by-default sellers |

### Public API

```rust
pub fn allow_currency(env: Env, seller: Address, code: Symbol) -> Result<(), AllowlistError>
pub fn is_allowed_currency(env: Env, seller: Address, code: Symbol) -> bool

// Free function the contract itself calls (also usable off-chain).
pub fn validate_asset_code(code: &str) -> Result<(), AllowlistError>
pub const MAX_ASSET_CODE_LEN: usize = 12;

#[repr(u32)]
pub enum AllowlistError { InvalidAssetCode = 1 }
```

### Semantics (documented in README + rustdoc)

1. **Per seller** — lists are independent; one seller's allowlist never answers for another.
2. **Seller-authored** — only `seller` can change their own list (`require_auth`); unauthorized attempts write nothing.
3. **Valid codes only** — 1–12 ASCII alphanumeric characters (Stellar asset-code rules); failures leave the list untouched.
4. **Idempotent** — allowing an already allowed code is a safe no-op.
5. **Read-only queries** — `is_allowed_currency` never traps: unknown sellers/invalid codes return `false`.

> Note on coverage: a Soroban `Symbol` can only carry `[a-zA-Z0-9_]` bytes, so illegal characters the host cannot even transport (spaces, dashes, dots, non-ASCII) are pinned through the exported `validate_asset_code` free function — the exact routine the contract executes — while underscore-carrying codes are pinned end-to-end through the contract.

### Tests: 31 pass (29 integration + 2 doc)

---

## Issue #882 — `contracts/multi_currency_invoice_tag/`

Tags an invoice with the single asset code it may be settled in, at creation time, and exposes a check so a proposed payment asset can be validated against that tag **before** the transfer happens.

### Files added (11)

| Path | Description |
|------|-------------|
| `contracts/multi_currency_invoice_tag/Cargo.toml` | Package manifest with standalone `[workspace]` table |
| `contracts/multi_currency_invoice_tag/.gitignore` | Standard Rust ignores |
| `contracts/multi_currency_invoice_tag/README.md` | Concept, rules, API signatures, build/test instructions |
| `contracts/multi_currency_invoice_tag/src/lib.rs` | Contract entry points + doc examples |
| `contracts/multi_currency_invoice_tag/src/types.rs` | `DataKey::Tag(Symbol)` |
| `contracts/multi_currency_invoice_tag/src/storage.rs` | Persistent tag: read / write |
| `contracts/multi_currency_invoice_tag/tests/common/mod.rs` | Shared setup |
| `contracts/multi_currency_invoice_tag/tests/happy_path.rs` | 6 tests — tag once, match, idempotent re-tag, independent invoices |
| `contracts/multi_currency_invoice_tag/tests/edge_boundary.rs` | 6 tests — 1-char codes, case sensitivity, one-char differences, 12-char codes, symbol forms |
| `contracts/multi_currency_invoice_tag/tests/failure_cases.rs` | 7 tests — conflicting re-tags rejected & original preserved, untagged matches nothing, no leakage |
| `contracts/multi_currency_invoice_tag/tests/scenarios.rs` | 5 tests — pre-transfer validation, batch validation matrix, settlement flow, churn isolation |

### Public API

```rust
pub fn tag_invoice(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool
pub fn matches_tag(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool
```

### Semantics (documented in README + rustdoc)

| Call | Result | Effect |
|------|--------|--------|
| First tag for an invoice | `true` | The tag is written |
| Re-tag with the *same* code | `true` | No-op; safe for retries |
| Tag a *different* code | `false` | Rejected; original tag preserved |
| `matches_tag` on tagged / untagged / mismatched | `true` / `false` / `false` | Exact symbol comparison; untagged invoices settle nothing "by default" |

### Tests: 25 pass (24 integration + 1 doc)

---

## Combined file inventory (45 files)

```
contracts/ledger_window_guard/          11 files
contracts/seller_currency_allowlist/    12 files
contracts/multi_currency_invoice_tag/   11 files
contracts/seller_invoice_rate_summary/  11 files
```

Each crate: `Cargo.toml`, `.gitignore`, `README.md`, ≥3 source modules (`src/lib.rs` split into dedicated logic/type/storage modules), `tests/common/mod.rs` + 4 separate test files (happy path, edge/boundary, failure/error, additional scenario).

## Verification

```bash
# Per crate (all four run from their own manifests):
cargo test --manifest-path contracts/seller_invoice_rate_summary/Cargo.toml   # 30 passed ✅
cargo test --manifest-path contracts/ledger_window_guard/Cargo.toml           # 33 passed ✅
cargo test --manifest-path contracts/seller_currency_allowlist/Cargo.toml     # 31 passed ✅
cargo test --manifest-path contracts/multi_currency_invoice_tag/Cargo.toml    # 25 passed ✅

cargo clippy --manifest-path <crate>/Cargo.toml --all-targets -- -D warnings # clean (exit 0) ✅ for all four
cargo fmt --check                                                            # clean for all four
```

- **119/119 tests pass** (110 integration + 9 doc tests), zero failed/ignored.
- **Clippy `-D warnings`: exit 0** for every crate (no warnings, no errors).
- Toolchain used: `cargo 1.99.1`, `clippy 0.1.99`, `soroban-sdk 25.x`.

## Scope compliance

| Requirement (all four issues) | Status |
|-------------------------------|--------|
| Each crate lives entirely under its own `contracts/<name>/` directory | ✅ |
| ≥10 files added per crate (11/12/11/11) | ✅ |
| ≥1 additional source module split out of `src/lib.rs` (3 each) | ✅ |
| ≥4 separate test files covering happy / boundary / failure / scenario (5 each) | ✅ |
| Suggested public API implemented and exported | ✅ |
| `cargo test --manifest-path …` passes | ✅ (all four) |
| `cargo clippy --manifest-path … --all-targets -- -D warnings` clean | ✅ (all four) |
| README documents concept, signatures, build/test (mirrors `quittance_receipt_hash/README.md`) | ✅ |
| Not added to `contracts/Cargo.toml` workspace members (standalone `[workspace]` table) | ✅ |

| Conflict-rule files (untouched) | Status |
|----------------------------------|--------|
| `frontend/app/pay/[id]/page.tsx`, `frontend/lib/export.ts`, `frontend/components/PaymentReceipt.tsx`, `frontend/components/TransactionHistory.tsx`, `frontend/components/PaymentButton.tsx`, `frontend/components/InvoiceForm.tsx`, `frontend/lib/stellar.ts` | ✅ unmodified |
| `contracts/Cargo.toml`, `contracts/Makefile`, `contracts/README.md`, `contracts/Cargo.lock` | ✅ unmodified |
| Any other file under `contracts/`, `frontend/`, `backend/` | ✅ unmodified — `git status` shows only the four new crate directories |

| Out of scope (per issue) | Status |
|--------------------------|--------|
| Deployment scripts / testnet-mainnet deployment | ✅ none |
| Cross-contract calls between repo crates | ✅ none |
| Wiring into Quittance's invoice/payment flow | ✅ none (standalone primitives only) |

## Design notes

- **Consistent family style** — each crate mirrors `invoice_currency_lock` / `sliding_window_counter`: `#![no_std]`, `#[contract]` / `#[contractimpl]`, `contracttype` storage keys, `#[contracterror]` with stable `#[repr(u32)]` discriminants where errors exist, typed test clients via `tests/common/mod.rs`.
- **Pure logic split from the host** — window arithmetic, validation, and counting live in dedicated modules (`window.rs`, `validate.rs`, `logic.rs`) that are unit-testable and reusable off-chain; the contract layer is a thin wrapper.
- **Saturating / checked arithmetic everywhere** — `saturating_sub`, `checked_sub`, `saturating_add`, and comparison-only predicates ensure no input (including `u32::MAX` / `u64::MAX` extremes, inverted windows, or duplicate floods) can overflow or panic, in debug or release builds.
- **Overflow checks on for release** — each standalone manifest sets `overflow-checks = true` in `[profile.release]`.
- **Read-only where specified** — #910 and #823 store nothing and never reject; #836 and #882 keep mutations minimal, authorized, idempotent, and reversible-on-failure (failed calls leave state untouched).
- **Symbol charset reality** — Soroban `Symbol`s only transport `[a-zA-Z0-9_]`; tests for illegal bytes that a Symbol cannot carry go through the exported `validate_asset_code`, the same routine the contract runs.

## Future integration (out of scope for this PR)

- Composing the allowlist (#836) and invoice tag (#882) into Quittance's real invoice creation / payment validation flow.
- Feeding the rolling rate summary (#910) into an actual per-seller rate-limiting contract (enforcement would be a separate issue).
- Deployment of any of the four crates to testnet/mainnet.

---

Closes #910, closes #823, closes #836, closes #882
