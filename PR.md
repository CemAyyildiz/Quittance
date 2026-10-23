# PR: Add `conversion-hint-store` crate — Non-authoritative conversion hint store

## Summary

Add a new, fully standalone Rust crate at `contracts/conversion_hint_store/` implementing validation logic for a non-authoritative currency conversion hint store.

This is a self-contained learning/utility primitive in the same family as existing `contracts/*` crates (e.g., `quittance_receipt_hash`, `destination_guard`, `auth_one_address`, `max_amount`, `batch-create-guard`, `payout-memo-binding`). It is **not wired** into the frontend, backend, or any other contract — it ships and is tested entirely on its own.

---

# Files Added (11 total)

| Path | Description |
|------|-------------|
| `contracts/conversion_hint_store/Cargo.toml` | Package manifest with standalone `[workspace]` table |
| `contracts/conversion_hint_store/.gitignore` | Standard Rust ignores |
| `contracts/conversion_hint_store/README.md` | Full documentation (concept, API, usage, test/run instructions) |
| `contracts/conversion_hint_store/src/lib.rs` | Public API exports with doc examples |
| `contracts/conversion_hint_store/src/types.rs` | `ConversionHintError`, `ConversionHintResult`, constants |
| `contracts/conversion_hint_store/src/validate.rs` | Core validation logic |
| `contracts/conversion_hint_store/tests/happy_path.rs` | 8 tests — successful validation scenarios |
| `contracts/conversion_hint_store/tests/edge_boundary.rs` | 9 tests — boundary cases, max length, min rate, large values |
| `contracts/conversion_hint_store/tests/failure_cases.rs` | 12 tests — every error variant, discriminant stability |
| `contracts/conversion_hint_store/tests/additional_scenario.rs` | 8 tests — multi-pair, reverse pairs, rate updates, stablecoins |

---

## Public API

```rust
// Currency symbol validation (non-empty, ≤12 chars)
pub fn validate_currency(currency: &str) -> ConversionHintResult

// Rate validation (must be positive in e7 format)
pub fn validate_rate(rate_e7: i128) -> ConversionHintResult

// Combined hint entry validation
pub fn validate_hint_entry(from: &str, to: &str, rate_e7: i128) -> ConversionHintResult

// Explicit non-authoritative disclaimer (always true)
pub fn is_non_authoritative() -> bool

// Storage key helpers for consuming contracts
pub fn hint_key(from: &str, to: &str) -> String          // "HINT_USD_XLM"
pub fn disclaimer_key(from: &str, to: &str) -> String    // "HINT_USD_XLM_DISCLAIMER"

// Stable error codes with #[repr(u32)]
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum ConversionHintError {
    InvalidRate = 1,
    InvalidCurrency = 2,
}
impl ConversionHintError {
    pub fn message(&self) -> &'static str;
}
```

---

## Non-Authoritative Disclaimer

**All rates validated by this library are non-authoritative.** They are:
- **Display hints only** — for UI estimation, not settlement.
- **Not guaranteed accurate** — may be stale, approximate, or wrong.
- **Not for financial use** — never use for invoicing, payment calculation, or accounting.

The `is_non_authoritative()` function always returns `true`, reinforcing this design intent.

---

## Test Coverage (38 tests total)

| Test File | Tests | Focus |
|-----------|-------|-------|
| `happy_path.rs` | 8 | Valid currencies, rates, hint entries, key generation, disclaimer |
| `edge_boundary.rs` | 9 | Max length (12), empty rejection, min rate (1), large values, case sensitivity |
| `failure_cases.rs` | 12 | Every `ConversionHintError` variant, discriminant stability, trait impls |
| `additional_scenario.rs` | 8 | Multi-pair independence, reverse pairs, rate updates, ISO codes, stablecoins |
| Doc tests | 1 | README examples |

---

## Verification

```bash
# From contracts/conversion_hint_store/
cargo test
# → 38 tests pass (unit + integration + doc)

cargo clippy --all-targets -- -D warnings
# → Clean (zero warnings)
```

---

## Scope Compliance

| Requirement | Status |
|-------------|--------|
| Crate entirely under `contracts/conversion_hint_store/` | ✅ |
| ≥10 files added | ✅ (11 files) |
| Public API implemented per spec | ✅ |
| `cargo test` passes | ✅ (38 tests) |
| `cargo clippy --all-targets -- -D warnings` clean | ✅ |
| README.md documents concept, signatures, build/test | ✅ |
| Not added to `contracts/Cargo.toml` workspace members | ✅ (own `[workspace]` table) |

| Out-of-Scope (Correctly Avoided) | Status |
|----------------------------------|--------|
| No changes to `frontend/`, `backend/`, other `contracts/*` | ✅ |
| No deployment scripts or testnet deployment | ✅ |
| No cross-contract calls | ✅ |
| No wiring into Quittance invoice/payment flow | ✅ |

| Conflict-Rule Files (Untouched) | Status |
|--------------------------------|--------|
| `contracts/Cargo.toml`, `contracts/Makefile`, `contracts/README.md`, `contracts/Cargo.lock` | ✅ |
| All listed frontend files | ✅ |

---

## Design Notes

- **Zero dependencies** — pure Rust (`std` only), compatible with `no_std` + `alloc` for Soroban contract use
- **e7 rate format** — 7 decimal places (1.0 = 10,000,000), matching Stellar convention
- **Explicit non-authoritative flag** — `NON_AUTHORITATIVE = true` constant, always returned by `is_non_authoritative()`
- **Stable error discriminants** — `#[repr(u32)]` for off-chain tooling parity
- **Storage key helpers** — `hint_key` / `disclaimer_key` for consuming contracts to use consistent key layout
- **Currency validation** — ISO 4217 compatible (3 chars standard, up to 12 for custom tokens)

---

## Future Integration (Out of Scope for This PR)

This primitive is designed to be composed into:
- A Soroban contract that stores/retrieves hints using the validation logic
- The Express backend's conversion hint endpoint
- Frontend display components showing approximate fiat values

Integration work would be a separate, later issue.