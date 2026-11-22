//! Pure rolling-window arithmetic for the invoice-creation rate summary.
//!
//! These helpers contain no storage access and no host calls: given the
//! recorded invoice-creation ledger numbers they count how many fall inside
//! a caller-specified recent ledger window. Every entry is evaluated
//! independently, so duplicates and unsorted input are handled for free.

/// Return the oldest ledger that is still inside the window ending at
/// `current_ledger`.
///
/// The window covers the `window` most recent ledgers, **ending at and
/// including `current_ledger`**:
///
/// - `window == 0` is an empty window and starts at `current_ledger`
///   (nothing is ever inside it, see [`is_recent`]),
/// - `window == 1` contains only `current_ledger`,
/// - `window == 10` contains `current_ledger - 9 ..= current_ledger`.
///
/// The subtraction saturates at ledger `0`, so a window that reaches
/// further back than the beginning of the chain simply starts at `0`.
#[must_use]
pub fn window_start(current_ledger: u32, window: u32) -> u32 {
    if window == 0 {
        current_ledger
    } else {
        current_ledger.saturating_sub(window - 1)
    }
}

/// Return `true` when an invoice created at `ledger` is inside the window
/// ending at `current_ledger`.
///
/// - An entry whose age is exactly `window` ledgers is **excluded**: the
///   window spans `window` ledgers, not `window + 1`.
/// - Entries above `current_ledger` (future-dated records) are **ignored**,
///   never counted.
/// - `window == 0` is an empty window: nothing is recent.
///
/// The age subtraction is guarded by `ledger <= current_ledger`, so it can
/// never underflow, and `window == 0` short-circuits before any arithmetic.
#[must_use]
pub fn is_recent(ledger: u32, current_ledger: u32, window: u32) -> bool {
    window > 0 && ledger <= current_ledger && current_ledger - ledger < window
}

/// Count how many of `creation_ledgers` fall inside the window ending at
/// `current_ledger`.
///
/// Each entry is evaluated independently:
///
/// - entries at or after `window_start(current_ledger, window)` count,
/// - an entry exactly `window` ledgers old does not count,
/// - future-dated entries do not count,
/// - duplicates each count separately (two invoices created in the same
///   ledger are two invoices),
/// - unsorted input produces the same result as sorted input.
///
/// The running count is accumulated with [`u32::saturating_add`], so even a
/// pathological input list cannot wrap the counter.
#[must_use]
pub fn count_in_recent_window<I>(creation_ledgers: I, current_ledger: u32, window: u32) -> u32
where
    I: IntoIterator<Item = u32>,
{
    creation_ledgers.into_iter().fold(0_u32, |count, ledger| {
        if is_recent(ledger, current_ledger, window) {
            count.saturating_add(1)
        } else {
            count
        }
    })
}
