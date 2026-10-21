//! The cap replaces the fee only once the uncapped fee is strictly larger.

use quittance_late_fee_calculator::late_fee;

#[test]
fn thirty_days_hits_a_five_percent_cap() {
    // uncapped = 1_000_000 * 30 * 100 / 10_000 = 300_000
    // cap      = 1_000_000 * 500 / 10_000 = 50_000
    assert_eq!(late_fee(1_000_000, 30, 100, 500).unwrap(), 50_000);
}

#[test]
fn one_unit_under_the_cap_is_not_capped() {
    // 4 days * 100 bps = 40_000, cap is 50_000.
    assert_eq!(late_fee(1_000_000, 4, 100, 500).unwrap(), 40_000);
}

#[test]
fn one_unit_over_the_cap_is_capped() {
    // 6 days * 100 bps = 60_000, cap is 50_000.
    assert_eq!(late_fee(1_000_000, 6, 100, 500).unwrap(), 50_000);
}

#[test]
fn a_zero_cap_forces_the_fee_to_zero() {
    assert_eq!(late_fee(1_000_000, 10, 50, 0).unwrap(), 0);
}

#[test]
fn daily_rate_above_one_hundred_percent_is_still_capped() {
    // uncapped = 10_000 * 1 * 20_000 / 10_000 = 20_000
    // cap      = 10_000 * 5_000 / 10_000 = 5_000
    assert_eq!(late_fee(10_000, 1, 20_000, 5_000).unwrap(), 5_000);
}

#[test]
fn many_days_at_a_high_rate_stop_at_the_cap() {
    // The raw product is large, but the 100% cap is the whole principal.
    assert_eq!(
        late_fee(10_000, u32::MAX, u32::MAX, 10_000).unwrap(),
        10_000
    );
}

#[test]
fn cap_on_i128_max_is_the_percentage_of_the_principal() {
    // 50% of i128::MAX, with a daily rate that would otherwise pass 50%
    // but whose uncapped fee still fits (1 bps * 6000 days = 60%).
    let cap = {
        let whole = i128::MAX / 10_000;
        let remainder = i128::MAX % 10_000;
        whole * 5_000 + (remainder * 5_000) / 10_000
    };
    assert_eq!(late_fee(i128::MAX, 6_000, 1, 5_000).unwrap(), cap);
}
