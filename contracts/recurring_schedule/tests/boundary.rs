//! Edges around the anchor, a one-second period, and the top of `u64`.

use recurring_schedule::next_due;

#[test]
fn one_second_before_the_anchor_is_the_first_due() {
    assert_eq!(next_due(500, 60, 499), Ok(500));
}

#[test]
fn one_second_after_the_anchor_skips_to_the_next_period() {
    assert_eq!(next_due(500, 60, 501), Ok(560));
}

#[test]
fn one_second_before_a_later_due_returns_that_due() {
    assert_eq!(next_due(1_000, 100, 1_199), Ok(1_200));
}

#[test]
fn a_one_second_interval_advances_by_one() {
    assert_eq!(next_due(10, 1, 15), Ok(16));
}

#[test]
fn largest_in_range_due_still_fits() {
    // Next step is 1, so the result is `u64::MAX` and does not overflow.
    assert_eq!(next_due(0, u64::MAX, u64::MAX - 1), Ok(u64::MAX));
    assert_eq!(next_due(u64::MAX - 10, 5, u64::MAX - 10), Ok(u64::MAX - 5));
}
