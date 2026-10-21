//! Rejected inputs and an uncapped fee that does not fit in `i128`.

use quittance_late_fee_calculator::{late_fee, LateFeeError};

#[test]
fn zero_amount_is_rejected() {
    assert_eq!(
        late_fee(0, 3, 100, 1_000),
        Err(LateFeeError::NonPositiveAmount)
    );
}

#[test]
fn negative_amount_is_rejected() {
    assert_eq!(
        late_fee(-1, 3, 100, 1_000),
        Err(LateFeeError::NonPositiveAmount)
    );
    assert_eq!(
        late_fee(i128::MIN, 0, 0, 0),
        Err(LateFeeError::NonPositiveAmount)
    );
}

#[test]
fn zero_days_does_not_excuse_a_non_positive_amount() {
    assert_eq!(
        late_fee(0, 0, 100, 1_000),
        Err(LateFeeError::NonPositiveAmount)
    );
}

#[test]
fn max_fee_above_one_hundred_percent_is_rejected() {
    assert_eq!(
        late_fee(1_000, 1, 1, 10_001),
        Err(LateFeeError::MaxFeeBpsTooLarge)
    );
    assert_eq!(
        late_fee(1_000, 0, 1, u32::MAX),
        Err(LateFeeError::MaxFeeBpsTooLarge)
    );
}

#[test]
fn input_checks_run_before_the_zero_day_shortcut() {
    assert_eq!(
        late_fee(-5, 0, 1, 10_001),
        Err(LateFeeError::NonPositiveAmount)
    );
    assert_eq!(
        late_fee(5, 0, 1, 10_001),
        Err(LateFeeError::MaxFeeBpsTooLarge)
    );
}

#[test]
fn uncapped_fee_that_does_not_fit_in_i128_is_an_error() {
    // floor(i128::MAX * 2) does not fit, even though the 100% cap would.
    assert_eq!(
        late_fee(i128::MAX, 2, 10_000, 10_000),
        Err(LateFeeError::Overflow)
    );
}

#[test]
fn three_bps_on_i128_max_still_fits() {
    // Exercises the wide multiply: i128::MAX * 3 needs more than 128 bits
    // before dividing by 10_000, and the quotient fits.
    let whole = i128::MAX / 10_000;
    let remainder = i128::MAX % 10_000;
    let expected = whole * 3 + (remainder * 3) / 10_000;
    assert_eq!(late_fee(i128::MAX, 1, 3, 10_000).unwrap(), expected);
}
