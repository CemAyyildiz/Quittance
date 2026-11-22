//! Type definitions for the `seller-invoice-rate-summary` crate.
//!
//! The summary is a read-only snapshot: it carries the reported count
//! together with the window it was computed for, so a consumer always knows
//! which question the number answers.

use soroban_sdk::contracttype;

use crate::logic;

/// A snapshot of the rolling invoice-creation rate summary.
///
/// Returned by
/// [`summarize`](crate::SellerInvoiceRateSummary::summarize): it pairs the
/// number of invoices created inside the window with the window itself, so
/// the count is never shown without its context.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct RateSummary {
    /// How many recorded creation ledgers fall inside the window.
    pub count: u32,
    /// The ledger the window ends at (inclusive).
    pub current_ledger: u32,
    /// The window width, in ledgers; `0` means an empty window.
    pub window: u32,
}

impl RateSummary {
    /// Build a summary from its three components.
    #[must_use]
    pub fn new(count: u32, current_ledger: u32, window: u32) -> Self {
        Self {
            count,
            current_ledger,
            window,
        }
    }

    /// The oldest ledger still inside the window (inclusive).
    ///
    /// Saturation matches [`logic::window_start`]: a window reaching past
    /// ledger `0` starts at `0`, and an empty (`window == 0`) window starts
    /// at `current_ledger`.
    #[must_use]
    pub fn window_start(&self) -> u32 {
        logic::window_start(self.current_ledger, self.window)
    }

    /// Return `true` when no invoice was created inside the window.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.count == 0
    }
}
