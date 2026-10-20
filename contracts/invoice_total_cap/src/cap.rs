//! Pure arithmetic for the per-seller invoice total cap.
//!
//! These helpers contain no storage access and no host calls, which makes
//! them cheap to unit test and easy to reuse in off-chain validators.

/// Return `running_total + new_amount`, or `None` when the addition would
/// overflow `i128`.
#[must_use]
pub fn checked_total(running_total: i128, new_amount: i128) -> Option<i128> {
    running_total.checked_add(new_amount)
}

/// Return `true` when adding `new_amount` to `running_total` would produce a
/// total strictly greater than `cap`.
///
/// Overflow counts as exceeding the cap: there is no finite cap that a
/// wrapped total could safely satisfy. A negative `new_amount` is treated as
/// a credit by this arithmetic predicate; the contract entry point separately
/// rejects non-positive invoices.
///
/// # Examples
///
/// ```
/// use invoice_total_cap::would_exceed_cap;
///
/// assert!(!would_exceed_cap(400, 600, 1_000)); // exactly at the cap
/// assert!(would_exceed_cap(400, 601, 1_000));  // one unit over
/// assert!(would_exceed_cap(i128::MAX, 1, i128::MAX)); // overflow
/// ```
#[must_use]
pub fn would_exceed_cap(running_total: i128, new_amount: i128, cap: i128) -> bool {
    match checked_total(running_total, new_amount) {
        Some(total) => total > cap,
        None => true,
    }
}

/// Return how much capacity remains for a seller before reaching `cap`.
///
/// A seller that is already at or above the cap has zero remaining
/// capacity. The result is saturating, so extreme `i128` inputs cannot
/// panic.
#[must_use]
pub fn remaining_capacity(running_total: i128, cap: i128) -> i128 {
    cap.saturating_sub(running_total).max(0)
}

/// Return `true` when `amount` is a valid positive invoice amount.
#[must_use]
pub fn is_valid_amount(amount: i128) -> bool {
    amount > 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checked_total_adds_normal_values() {
        assert_eq!(checked_total(100, 250), Some(350));
        assert_eq!(checked_total(0, 0), Some(0));
    }

    #[test]
    fn checked_total_reports_overflow() {
        assert_eq!(checked_total(i128::MAX, 1), None);
        assert_eq!(checked_total(i128::MIN, -1), None);
    }

    #[test]
    fn below_cap_does_not_exceed() {
        assert!(!would_exceed_cap(0, 1, 1_000));
        assert!(!would_exceed_cap(999, 0, 1_000));
    }

    #[test]
    fn exact_cap_is_allowed() {
        assert!(!would_exceed_cap(400, 600, 1_000));
    }

    #[test]
    fn one_unit_over_cap_exceeds() {
        assert!(would_exceed_cap(400, 601, 1_000));
    }

    #[test]
    fn overflow_always_exceeds() {
        assert!(would_exceed_cap(i128::MAX, 1, i128::MAX));
    }

    #[test]
    fn remaining_capacity_is_clamped_to_zero() {
        assert_eq!(remaining_capacity(400, 1_000), 600);
        assert_eq!(remaining_capacity(1_000, 1_000), 0);
        assert_eq!(remaining_capacity(1_001, 1_000), 0);
    }

    #[test]
    fn remaining_capacity_handles_extremes_without_panicking() {
        assert_eq!(remaining_capacity(i128::MIN, 0), i128::MAX);
        assert_eq!(remaining_capacity(0, i128::MIN), 0);
    }

    #[test]
    fn amount_must_be_strictly_positive() {
        assert!(is_valid_amount(1));
        assert!(!is_valid_amount(0));
        assert!(!is_valid_amount(-1));
    }
}
