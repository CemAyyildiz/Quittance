//! `ledger-window-guard` — standalone Soroban contract: generic ledger
//! timestamp window guard.
//!
//! A reusable "is this timestamp within `[start, end]`?" predicate with
//! overflow-safe arithmetic. Both bounds are inclusive, an inverted window
//! (`start > end`) matches nothing, and no caller-supplied input can cause an
//! overflow or a panic: the guard only ever compares integers.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, stores nothing on chain, and
//! is not wired into the Quittance frontend or backend.
//!
//! # What it does
//!
//! [`LedgerWindowGuard::in_window`] answers a single question — is `ts`
//! inside the inclusive window `[start, end]`? — and returns `bool`:
//!
//! | Input | Result | Reason |
//! |-------|--------|--------|
//! | `start <= ts <= end` | `true` | Inside, both bounds inclusive. |
//! | `ts < start` or `ts > end` | `false` | Outside the window. |
//! | `start > end` (inverted) | `false` | Malformed window matches nothing. |
//!
//! # Rules
//!
//! 1. **Both bounds are inclusive** — `ts == start` and `ts == end` are in
//!    the window.
//! 2. **Inverted windows are empty** — `start > end` returns `false` for
//!    every `ts`, instead of underflowing.
//! 3. **Overflow-safe** — only comparisons are performed; there is no
//!    `ts - start` or `end - start` that could wrap. The companion
//!    [`window_len`] helper uses [`u64::checked_sub`] and reports inverted
//!    windows as `None`.
//! 4. **Read-only** — the contract holds no storage and no configuration;
//!    the same inputs always produce the same output.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `in_window(ts, start, end)` | `fn(Env, u64, u64, u64) -> bool` | Is `ts` inside the inclusive window? |
//! | `in_window(ts, start, end)` (free fn) | `fn(u64, u64, u64) -> bool` | Same predicate without the host. |
//! | `window_len(start, end)` | `fn(u64, u64) -> Option<u64>` | Window width, `None` when inverted. |
//! | `Window` | `struct` | Owned `[start, end]` value with `contains` / `span` / `is_inverted`. |
//!
//! # Usage
//!
//! ```rust
//! use ledger_window_guard::{LedgerWindowGuard, LedgerWindowGuardClient};
//! use soroban_sdk::Env;
//!
//! let env = Env::default();
//! let contract_id = env.register(LedgerWindowGuard, ());
//! let client = LedgerWindowGuardClient::new(&env, &contract_id);
//!
//! // A retry window of 300 seconds, opened at t = 1_000_000.
//! let start = 1_000_000_u64;
//! let end = 1_000_300_u64;
//!
//! assert!(client.in_window(&1_000_150, &start, &end)); // inside
//! assert!(client.in_window(&1_000_000, &start, &end)); // exactly start
//! assert!(client.in_window(&1_000_300, &start, &end)); // exactly end
//! assert!(!client.in_window(&1_000_301, &start, &end)); // too late
//! assert!(!client.in_window(&1_000_150, &end, &start)); // inverted window
//! ```
//!
//! The same predicate is available off-chain, without registering a
//! contract, via the free function:
//!
//! ```
//! use ledger_window_guard::{in_window, window_len};
//!
//! assert!(in_window(150, 100, 200));
//! assert_eq!(window_len(100, 200), Some(100));
//! assert_eq!(window_len(200, 100), None); // inverted, no underflow
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cargo test --manifest-path contracts/ledger_window_guard/Cargo.toml
//! cargo clippy --manifest-path contracts/ledger_window_guard/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod types;
mod window;

pub use crate::types::Window;
pub use crate::window::{in_window, window_len};

use soroban_sdk::{contract, contractimpl, Env};

/// Generic ledger timestamp window guard.
#[contract]
pub struct LedgerWindowGuard;

#[contractimpl]
impl LedgerWindowGuard {
    /// Return whether `ts` falls inside the inclusive window
    /// `[start, end]`.
    ///
    /// Both bounds are included, so `ts == start` and `ts == end` return
    /// `true`. An inverted window (`start > end`) is malformed and returns
    /// `false` for every `ts` — the guard never underflows, it only compares.
    ///
    /// The contract is read-only: it stores nothing, and the same inputs
    /// always produce the same answer.
    pub fn in_window(_env: Env, ts: u64, start: u64, end: u64) -> bool {
        window::in_window(ts, start, end)
    }
}
