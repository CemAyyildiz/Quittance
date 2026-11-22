//! Pure range arithmetic, kept free of `Env` so it can be unit-tested on the
//! host target without a contract instance.

use crate::types::{AmountRange, RangeError};

/// Validate and construct an [`AmountRange`].
///
/// Both `min` and `max` must be non-negative, and `min` must be ≤ `max`.
/// Amounts are denominated in stroops; negative values are not valid invoice
/// denominations.
pub fn new_range(min: i128, max: i128) -> Result<AmountRange, RangeError> {
    if min < 0 || max < 0 || min > max {
        Err(RangeError::InvalidRange)
    } else {
        Ok(AmountRange { min, max })
    }
}

/// Check whether `amount` falls within the inclusive range `[min, max]`.
pub fn contains(range: &AmountRange, amount: i128) -> bool {
    amount >= range.min && amount <= range.max
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── new_range ────────────────────────────────────────────────────────────

    #[test]
    fn valid_range_is_accepted() {
        let r = new_range(100, 1_000).unwrap();
        assert_eq!(r.min, 100);
        assert_eq!(r.max, 1_000);
    }

    #[test]
    fn min_equals_max_is_valid() {
        let r = new_range(500, 500).unwrap();
        assert_eq!(r.min, 500);
        assert_eq!(r.max, 500);
    }

    #[test]
    fn zero_zero_range_is_valid() {
        assert!(new_range(0, 0).is_ok());
    }

    #[test]
    fn zero_min_is_valid() {
        assert!(new_range(0, 1_000).is_ok());
    }

    #[test]
    fn negative_min_is_rejected() {
        assert_eq!(new_range(-1, 100), Err(RangeError::InvalidRange));
    }

    #[test]
    fn negative_max_is_rejected() {
        assert_eq!(new_range(0, -1), Err(RangeError::InvalidRange));
    }

    #[test]
    fn both_negative_is_rejected() {
        assert_eq!(new_range(-10, -1), Err(RangeError::InvalidRange));
    }

    #[test]
    fn inverted_range_is_rejected() {
        assert_eq!(new_range(100, 99), Err(RangeError::InvalidRange));
    }

    // ── contains ────────────────────────────────────────────────────────────

    #[test]
    fn amount_at_min_is_contained() {
        let r = new_range(100, 1_000).unwrap();
        assert!(contains(&r, 100));
    }

    #[test]
    fn amount_at_max_is_contained() {
        let r = new_range(100, 1_000).unwrap();
        assert!(contains(&r, 1_000));
    }

    #[test]
    fn amount_inside_range_is_contained() {
        let r = new_range(100, 1_000).unwrap();
        assert!(contains(&r, 500));
    }

    #[test]
    fn amount_below_min_is_not_contained() {
        let r = new_range(100, 1_000).unwrap();
        assert!(!contains(&r, 99));
    }

    #[test]
    fn amount_above_max_is_not_contained() {
        let r = new_range(100, 1_000).unwrap();
        assert!(!contains(&r, 1_001));
    }

    #[test]
    fn single_point_range_contains_only_that_point() {
        let r = new_range(42, 42).unwrap();
        assert!(contains(&r, 42));
        assert!(!contains(&r, 41));
        assert!(!contains(&r, 43));
    }
}
