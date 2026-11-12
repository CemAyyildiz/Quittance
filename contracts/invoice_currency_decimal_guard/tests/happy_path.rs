mod common;

use invoice_currency_decimal_guard::STELLAR_DEFAULT_DECIMALS;

#[test]
fn matching_stellar_default_decimals_returns_true() {
    let (_env, client) = common::setup();
    assert!(client.matches_expected_decimals(&STELLAR_DEFAULT_DECIMALS, &7));
    client.require_expected_decimals(&7, &7);
}

#[test]
fn matching_six_and_eighteen_decimals_succeed() {
    let (_env, client) = common::setup();
    assert!(client.matches_expected_decimals(&6, &6));
    assert!(client.matches_expected_decimals(&18, &18));
    client.require_expected_decimals(&6, &6);
    client.require_expected_decimals(&18, &18);
}

#[test]
fn validate_decimals_accepts_valid_values() {
    let (_env, client) = common::setup();
    for d in [0_u32, 2, 6, 7, 8, 12, 18] {
        client.validate_decimals(&d);
    }
}
