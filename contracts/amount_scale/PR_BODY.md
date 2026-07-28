# Summary

Adds `contracts/amount_scale/`, a small **dependency-free** Rust crate that converts between **stroops** (`i128`, Stellar's on-chain integer unit) and **display units** for assets that resolve to **7 decimal places** (XLM and most Stellar-native assets).

This is the first on-chain piece of code in the repo. It is intentionally pure math — no payment logic, no storage, no trustline logic — so it can be reused both inside future Soroban contracts (Phase E per `PLAN.md` §9) and in off-chain workers.

## What's in this PR

- `contracts/amount_scale/Cargo.toml` — standalone crate, `edition = "2021"`, no external dependencies, `publish = false`, `crate-type = ["rlib"]`.
- `contracts/amount_scale/src/lib.rs` — module docs, constants, and three public helpers:
  - `pub const DECIMALS: u32 = 7`
  - `pub const STROOPS_PER_UNIT: i128 = 10_000_000`
  - `pub fn to_stroops(display_amount: i128) -> Option<i128>`
  - `pub fn from_stroops(stroops: i128) -> Option<i128>`
  - `pub fn remainder_stroops(stroops: i128) -> Option<i128>`
- **16 `#[cfg(test)]` unit tests** covering: zero inputs, one XLM, a realistic 12,345,678-unit value, the max-safe boundary, just-over-boundary overflow, negative-input rejection, sub-display-unit truncation, `i128::MAX` stroops, residue stay-and-resurface, and a `round_trip_table` over a representative set of display amounts.
- Doctest examples on every public function.
- `contracts/amount_scale/README.md` — API table, usage examples, explicit scope and non-goals, run-tests instructions.
- `contracts/amount_scale/.gitignore` — drops `target/`.

## Math & safety

Every conversion goes through `i128::checked_*`, so overflow surfaces as `None` instead of panicking or silently wrapping. Negative inputs are rejected up front (Stellar amounts are non-negative). All three helpers are `#[must_use = "…"]` so callers cannot accidentally discard a `None` overflow signal. `#![deny(unsafe_code)]` and `#![deny(unused_must_use)]` are enforced crate-wide.

## Out of scope (deliberately)

- Trustline logic, SAC interactions, or any business rules.
- Storage (instance / persistent ledger use).
- Configurable decimal precision. The crate is hard-coded to 7 decimals; a sibling helper is the right place for other precisions — do not version this one.
- Wiring to the Next.js or Express MVP demos. That is targeted for a separate PR per `PLAN.md` §9 Phase E.

## Conflict rule respected

This PR touches **only** new files inside `contracts/amount_scale/` (and its crate files). It does not edit anything owned by the in-flight PRs (#11 / #29 for `frontend/app/pay/[id]/page.tsx`, #12 for `frontend/lib/stellar.ts` / `InvoiceForm.tsx` / `PaymentButton.tsx`, #23 / #28 for `frontend/lib/export.ts`, #24 for `PaymentReceipt.tsx`, #25 for `TransactionHistory.tsx`). Single-ownership clean.

## Verification

The host does not currently have a Rust toolchain installed, so `cargo test` was not run here. The crate has zero external dependencies, so the test run is fast:

```bash
cd contracts/amount_scale
cargo test
```

A GitHub Actions workflow for `contracts/` is a natural follow-up and will be handled in a separate PR (suggested below).

Closes #31
