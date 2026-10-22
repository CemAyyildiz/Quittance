//! Value types for the ledger timestamp window guard.
//!
//! [`Window`] is a small owned value that bundles a `[start, end]` bound pair
//! and exposes the same overflow-safe predicates as the free functions in
//! [`crate::window`]. It is a plain data type — it is never stored on chain
//! and is not part of the contract's entry points.

use crate::window;

/// An inclusive `[start, end]` timestamp window.
///
/// Both bounds are included: a timestamp equal to `start` or to `end` is
/// inside the window. An *inverted* window (`start > end`) is a malformed
/// window that contains nothing; it is never silently repaired, and every
/// query against it returns `false`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Window {
    /// First timestamp that is inside the window (inclusive).
    pub start: u64,
    /// Last timestamp that is inside the window (inclusive).
    pub end: u64,
}

impl Window {
    /// Create a window from a `[start, end]` bound pair.
    ///
    /// The bounds are stored as given; an inverted pair (`start > end`) is
    /// legal to construct and simply matches nothing, see
    /// [`contains`](Self::contains) and [`is_inverted`](Self::is_inverted).
    #[must_use]
    pub fn new(start: u64, end: u64) -> Self {
        Self { start, end }
    }

    /// Return `true` when `ts` falls inside this window.
    ///
    /// Inverted windows always return `false`.
    #[must_use]
    pub fn contains(&self, ts: u64) -> bool {
        window::in_window(ts, self.start, self.end)
    }

    /// Return the width of this window in seconds (`end - start`), or
    /// `None` when the window is inverted.
    ///
    /// A window whose bounds are the same instant has width `Some(0)` but
    /// still contains that single instant.
    #[must_use]
    pub fn span(&self) -> Option<u64> {
        window::window_len(self.start, self.end)
    }

    /// Return `true` when the bounds are inverted (`start > end`), i.e. the
    /// window is malformed and can never contain a timestamp.
    #[must_use]
    pub fn is_inverted(&self) -> bool {
        self.start > self.end
    }
}
