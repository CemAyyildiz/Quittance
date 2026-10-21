//! Pure window arithmetic for the sliding ledger-window counter.
//!
//! These helpers contain no storage access and no host calls, which makes
//! them cheap to unit test and easy to reuse in off-chain validators.

/// Return the first ledger that is inside the window ending at
/// `current_ledger`.
///
/// The window is **inclusive on both ends** and spans `window` ledgers:
///
/// - `window == 0` is an empty window and starts at `current_ledger`
///   (nothing is ever inside it, see [`is_in_window`]),
/// - `window == 1` contains only `current_ledger`,
/// - `window == 100` contains `current_ledger - 99 ..= current_ledger`.
///
/// The subtraction saturates at ledger `0`, so a window that reaches further
/// back than the beginning of the chain simply starts at `0`.
#[must_use]
pub fn window_start(current_ledger: u32, window: u32) -> u32 {
    if window == 0 {
        current_ledger
    } else {
        current_ledger.saturating_sub(window - 1)
    }
}

/// Return `true` when an event recorded at `ledger` falls inside the window
/// ending at `current_ledger`.
///
/// A window of `0` ledgers is empty, so nothing is ever inside it. Events
/// recorded in the future (above `current_ledger`) are never inside the
/// window either.
#[must_use]
pub fn is_in_window(ledger: u32, current_ledger: u32, window: u32) -> bool {
    if window == 0 {
        return false;
    }
    ledger >= window_start(current_ledger, window) && ledger <= current_ledger
}

/// Count how many of `records` fall inside the window ending at
/// `current_ledger`.
///
/// Every record counts separately: two events recorded in the same ledger are
/// two events, not one.
#[must_use]
pub fn count_in_window<I>(records: I, current_ledger: u32, window: u32) -> u32
where
    I: IntoIterator<Item = u32>,
{
    records
        .into_iter()
        .fold(0_u32, |count, ledger| {
            if is_in_window(ledger, current_ledger, window) {
                count.saturating_add(1)
            } else {
                count
            }
        })
}

/// Return `true` when a record is old enough to be dropped by
/// [`crate::SlidingWindowCounter::prune`].
///
/// Records in the future are never pruned: they may still become part of a
/// later window.
#[must_use]
pub fn is_prunable(ledger: u32, current_ledger: u32, window: u32) -> bool {
    if window == 0 {
        return ledger < current_ledger;
    }
    ledger < window_start(current_ledger, window)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn zero_window_is_empty() {
        assert_eq!(window_start(100, 0), 100);
        assert!(!is_in_window(100, 100, 0));
        assert!(!is_in_window(99, 100, 0));
    }

    #[test]
    fn one_ledger_window_contains_only_the_current_ledger() {
        assert_eq!(window_start(100, 1), 100);
        assert!(is_in_window(100, 100, 1));
        assert!(!is_in_window(99, 100, 1));
    }

    #[test]
    fn window_spans_the_expected_ledgers() {
        assert_eq!(window_start(100, 10), 91);
        assert!(is_in_window(91, 100, 10));
        assert!(!is_in_window(90, 100, 10));
    }

    #[test]
    fn future_records_are_outside_the_window() {
        assert!(!is_in_window(101, 100, 10));
    }

    #[test]
    fn window_start_saturates_at_zero() {
        assert_eq!(window_start(5, 100), 0);
        assert_eq!(window_start(0, u32::MAX), 0);
    }

    #[test]
    fn count_only_includes_records_inside_the_window() {
        let records = [95_u32, 96, 97, 98, 99, 100, 101];
        assert_eq!(count_in_window(records, 100, 5), 5);
        assert_eq!(count_in_window(records, 100, 1), 1);
        assert_eq!(count_in_window(records, 100, 0), 0);
    }

    #[test]
    fn duplicate_records_are_counted_separately() {
        assert_eq!(count_in_window([100_u32, 100, 100], 100, 10), 3);
    }

    #[test]
    fn prunable_records_are_the_ones_before_the_window() {
        assert!(is_prunable(90, 100, 10));
        assert!(!is_prunable(91, 100, 10));
        assert!(!is_prunable(101, 100, 10));
    }
}
