mod common;

use invoice_currency_decimal_guard::MAX_TOKEN_DECIMALS;

#[test]
fn zero_decimals_matches_zero() {
    let (_env, client) = common::setup();
    assert!(client.matches_expected_decimals(&0, &0));
    client.require_expected_decimals(&0, &0);
}

#[test]
fn max_supported_decimals_boundary_matches() {
    let (_env, client) = common::setup();
    let max = client.max_supported_decimals();
    assert_eq!(max, MAX_TOKEN_DECIMALS);
    assert!(client.matches_expected_decimals(&max, &max));
    assert!(!client.matches_expected_decimals(&(max + 1), &(max + 1)));
    assert!(!client.matches_expected_decimals(&u32::MAX, &u32::MAX));
}
