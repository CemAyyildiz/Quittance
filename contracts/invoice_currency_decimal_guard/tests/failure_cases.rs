mod common;

use invoice_currency_decimal_guard::DecimalGuardError;

#[test]
fn mismatch_between_seven_and_six_is_rejected() {
    let (_env, client) = common::setup();
    assert!(!client.matches_expected_decimals(&7, &6));
    let res = client.try_require_expected_decimals(&7, &6);
    assert_eq!(res, Err(Ok(DecimalGuardError::DecimalsMismatch)));
}

#[test]
fn out_of_range_token_decimals_is_rejected() {
    let (_env, client) = common::setup();
    let res = client.try_require_expected_decimals(&19, &7);
    assert_eq!(res, Err(Ok(DecimalGuardError::TokenDecimalsOutOfRange)));
}

#[test]
fn out_of_range_expected_decimals_is_rejected() {
    let (_env, client) = common::setup();
    let res = client.try_require_expected_decimals(&7, &24);
    assert_eq!(res, Err(Ok(DecimalGuardError::ExpectedDecimalsOutOfRange)));
}
