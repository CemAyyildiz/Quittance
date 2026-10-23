//! Pure timestamp-window arithmetic for the ledger window guard.
//!
//! These helpers contain no storage access and no host calls. They only
//! compare integers — no subtraction is ever performed on caller-supplied
//! bounds — so no input can overflow, underflow, or panic, in debug or in
//! release builds.

/// Return `true` when `ts` falls inside the inclusive window
/// `[start, end]`.
///
/// Both bounds are inclusive:
///
/// - `ts == start` is inside the window,
/// - `ts == end` is inside the window,
/// - `ts < start` or `ts > end` is outside the window.
///
/// An inverted window (`start > end`) contains nothing and always returns
/// `false`, instead of underflowing the way a naive `ts - start <= end - start`
/// computation would.
///
/// # Examples
///
/// ```
/// use ledger_window_guard::in_window;
///
/// assert!(in_window(150, 100, 200)); // strictly inside
/// assert!(in_window(100, 100, 200)); // exactly the start bound
/// assert!(in_window(200, 100, 200)); // exactly the end bound
/// assert!(!in_window(99, 100, 200)); // one before the start
/// assert!(!in_window(201, 100, 200)); // one after the end
/// assert!(!in_window(150, 200, 100)); // inverted window is empty
/// ```
#[must_use]
pub fn in_window(ts: u64, start: u64, end: u64) -> bool {
    start <= ts && ts <= end
}

/// Return the width of the window in seconds as `end - start`, or `None`
/// when the window is inverted (`start > end`).
///
/// A window whose bounds are the same instant has width `0` but still
/// contains that one instant (see [`in_window`]).
///
/// The subtraction uses [`u64::checked_sub`], so an inverted window — where
/// a plain `end - start` would wrap or panic with overflow checks on — is
/// reported as `None` instead.
///
/// # Examples
///
/// ```
/// use ledger_window_guard::window_len;
///
/// assert_eq!(window_len(100, 200), Some(100));
/// assert_eq!(window_len(100, 100), Some(0));
/// assert_eq!(window_len(200, 100), None); // inverted window
/// ```
#[must_use]
pub fn window_len(start: u64, end: u64) -> Option<u64> {
    end.checked_sub(start)
}
