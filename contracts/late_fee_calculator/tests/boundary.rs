//! Boundaries: zero days, truncation, exact cap, and the ends of the bps range.

use quittance_late_fee_calculator::late_fee;

#[test]
fn zero_days_overdue_is_a_zero_fee() {
    assert_eq!(late_fee(1_000_000, 0, 10_000, 10_000).unwrap(), 0);
    assert_eq!(late_fee(i128::MAX, 0, u32::MAX, 10_000).unwrap(), 0);
}

#[test]
fn zero_daily_rate_is_a_zero_fee() {
    assert_eq!(late_fee(1_000_000, 40, 0, 5_000).unwrap(), 0);
}

#[test]
fn sub_basis_point_fee_truncates_to_zero() {
    // 9_999 * 1 * 1 / 10_000 = 0
    assert_eq!(late_fee(9_999, 1, 1, 10_000).unwrap(), 0);
    // The next stroop crosses a whole basis point.
    assert_eq!(late_fee(10_000, 1, 1, 10_000).unwrap(), 1);
}

#[test]
fn smallest_positive_amount_is_accepted() {
    assert_eq!(late_fee(1, 1, 1, 10_000).unwrap(), 0);
    assert_eq!(late_fee(1, 1, 10_000, 10_000).unwrap(), 1);
}

#[test]
fn max_fee_bps_of_exactly_ten_thousand_is_allowed() {
    assert_eq!(late_fee(10_000, 1, 1, 10_000).unwrap(), 1);
}

#[test]
fn fee_equal_to_the_cap_is_unchanged() {
    // uncapped = 1_000_000 * 5 * 100 / 10_000 = 50_000
    // cap      = 1_000_000 * 500 / 10_000 = 50_000
    assert_eq!(late_fee(1_000_000, 5, 100, 500).unwrap(), 50_000);
}

#[test]
fn rate_above_the_cap_can_still_truncate_to_the_same_fee() {
    // Both sides floor to 0, so the cap does not change the result.
    assert_eq!(late_fee(1, 1, 5_000, 100).unwrap(), 0);
}

#[test]
fn one_day_at_one_bps_on_i128_max_matches_integer_division() {
    let expected = i128::MAX / 10_000;
    assert_eq!(late_fee(i128::MAX, 1, 1, 10_000).unwrap(), expected);
}
