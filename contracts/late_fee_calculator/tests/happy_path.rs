//! Happy path: a positive principal, a positive rate, and a fee under the cap.

use quittance_late_fee_calculator::late_fee;

#[test]
fn ten_days_at_fifty_bps_stays_under_the_cap() {
    // 1_000_000 * 10 * 50 / 10_000 = 50_000
    // cap = 1_000_000 * 1_000 / 10_000 = 100_000
    let fee = late_fee(1_000_000, 10, 50, 1_000).unwrap();
    assert_eq!(fee, 50_000);
}

#[test]
fn one_day_at_one_percent_of_ten_xlm() {
    // 100_000_000 stroops (10 XLM) * 1 day * 100 bps / 10_000 = 1_000_000
    let fee = late_fee(100_000_000, 1, 100, 5_000).unwrap();
    assert_eq!(fee, 1_000_000);
}

#[test]
fn matches_direct_i128_math_for_values_that_fit() {
    let amount = 8_675_309_i128;
    let days = 12_u32;
    let bps = 37_u32;
    let max_bps = 2_500_u32;
    let expected = amount * i128::from(days) * i128::from(bps) / 10_000;
    assert!(expected < amount * i128::from(max_bps) / 10_000);
    assert_eq!(late_fee(amount, days, bps, max_bps).unwrap(), expected);
}

#[test]
fn full_amount_when_one_day_is_charged_at_one_hundred_percent() {
    assert_eq!(late_fee(25_000, 1, 10_000, 10_000).unwrap(), 25_000);
    assert_eq!(late_fee(i128::MAX, 1, 10_000, 10_000).unwrap(), i128::MAX);
}
