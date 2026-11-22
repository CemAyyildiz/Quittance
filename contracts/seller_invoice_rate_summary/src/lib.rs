//! `seller-invoice-rate-summary` — standalone Soroban contract: rolling
//! invoice-creation rate summary.
//!
//! A read-only summary primitive: given a seller's recorded
//! invoice-creation ledger numbers, it reports how many were created within
//! a caller-specified recent ledger window. It is the reporting counterpart
//! to rate-limiting primitives — it counts, it never rejects, and it stores
//! nothing of its own.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.
//!
//! # What it does
//!
//! [`SellerInvoiceRateSummary::count_in_recent_window`] takes the recorded
//! creation ledgers, the current ledger, and a window width, and returns
//! how many entries fall inside the window:
//!
//! | Input | Result | Reason |
//! |-------|--------|--------|
//! | Entry with age `< window` | counted | Inside the window. |
//! | Entry with age `== window` | not counted | The window spans `window` ledgers, ending at (and including) `current_ledger`. |
//! | Entry `> current_ledger` | not counted | Future-dated records are ignored. |
//! | `window == 0` | `0` | An empty window holds nothing. |
//! | Empty list | `0` | Nothing to count. |
//!
//! # Window semantics
//!
//! The window covers the `window` most recent ledgers, **ending at and
//! including `current_ledger`**:
//!
//! - `window == 10`, `current_ledger == 100` → ledgers `91 ..= 100`,
//! - an entry at ledger `90` (exactly 10 ledgers old) is **excluded**,
//! - an entry at ledger `91` (9 ledgers old) is **included**,
//! - a window reaching before ledger `0` saturates at `0`.
//!
//! Every entry is evaluated independently, so duplicates count separately,
//! unsorted input is fine, and future-dated entries are ignored rather than
//! clamped. The count accumulates with `u32::saturating_add`, so no input
//! can wrap it.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `count_in_recent_window(creation_ledgers, current_ledger, window)` | `fn(Env, Vec<u32>, u32, u32) -> u32` | How many creations fall inside the window. |
//! | `summarize(creation_ledgers, current_ledger, window)` | `fn(Env, Vec<u32>, u32, u32) -> RateSummary` | The same count, paired with the window it answers for. |
//! | `count_in_recent_window(...)` (free fn) | `fn(I, u32, u32) -> u32` | Same logic without the host, over any `u32` iterator. |
//! | `is_recent(ledger, current, window)` | `fn(u32, u32, u32) -> bool` | Per-entry membership test. |
//! | `window_start(current, window)` | `fn(u32, u32) -> u32` | Oldest ledger inside the window. |
//! | `RateSummary` | `struct` | `{ count, current_ledger, window }` snapshot with `window_start` / `is_empty`. |
//!
//! # Usage
//!
//! ```rust
//! use seller_invoice_rate_summary::{
//!     SellerInvoiceRateSummary, SellerInvoiceRateSummaryClient,
//! };
//! use soroban_sdk::{vec, Env};
//!
//! let env = Env::default();
//! let contract_id = env.register(SellerInvoiceRateSummary, ());
//! let client = SellerInvoiceRateSummaryClient::new(&env, &contract_id);
//!
//! // Invoices created at ledgers 95, 98, 100 and 120.
//! let creation_ledgers = vec![&env, 95_u32, 98, 100, 120];
//!
//! // At ledger 100 the last 10 ledgers (91..=100) hold three of them;
//! // ledger 120 is future-dated relative to 100 and is ignored.
//! assert_eq!(client.count_in_recent_window(&creation_ledgers, &100, &10), 3);
//!
//! // Advance to ledger 105: 95 is now exactly 10 ledgers old and drops out.
//! assert_eq!(client.count_in_recent_window(&creation_ledgers, &105, &10), 2);
//!
//! // The summary pairs the count with the window it answers for.
//! let summary = client.summarize(&creation_ledgers, &100, &10);
//! assert_eq!(summary.count, 3);
//! assert_eq!(summary.window_start(), 91);
//! assert!(!summary.is_empty());
//! ```
//!
//! The same logic is available off-chain, without registering a contract:
//!
//! ```
//! use seller_invoice_rate_summary::count_in_recent_window;
//!
//! // Window of 10 ending at 100 covers ledgers 91..=100.
//! assert_eq!(count_in_recent_window([95_u32, 91, 90, 100], 100, 10), 3);
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cargo test --manifest-path contracts/seller_invoice_rate_summary/Cargo.toml
//! cargo clippy --manifest-path contracts/seller_invoice_rate_summary/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod types;

pub use crate::logic::{count_in_recent_window, is_recent, window_start};
pub use crate::types::RateSummary;

use soroban_sdk::{contract, contractimpl, Env, Vec};

/// Rolling invoice-creation rate summary.
#[contract]
pub struct SellerInvoiceRateSummary;

#[contractimpl]
impl SellerInvoiceRateSummary {
    /// Count how many of `creation_ledgers` were created within the last
    /// `window` ledgers ending at (and including) `current_ledger`.
    ///
    /// Read-only: nothing is stored and nothing is rejected — the contract
    /// only reports. Entries exactly `window` ledgers old are excluded,
    /// future-dated entries are ignored, `window == 0` counts `0`, and
    /// duplicates each count separately.
    pub fn count_in_recent_window(
        _env: Env,
        creation_ledgers: Vec<u32>,
        current_ledger: u32,
        window: u32,
    ) -> u32 {
        logic::count_in_recent_window(creation_ledgers.iter(), current_ledger, window)
    }

    /// Return the count above paired with the window it answers for, so a
    /// consumer always sees which question the number was computed for.
    ///
    /// The snapshot is read-only and derived entirely from its arguments:
    /// `{ count, current_ledger, window }`, with `window_start()` giving the
    /// oldest ledger still inside the window.
    pub fn summarize(
        _env: Env,
        creation_ledgers: Vec<u32>,
        current_ledger: u32,
        window: u32,
    ) -> RateSummary {
        let count = logic::count_in_recent_window(creation_ledgers.iter(), current_ledger, window);
        RateSummary::new(count, current_ledger, window)
    }
}
