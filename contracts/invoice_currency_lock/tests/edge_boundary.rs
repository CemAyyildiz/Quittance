//! Edge and boundary-case tests for `invoice-currency-lock`.
//!
//! These cover the exact edges of the accepted asset codes and of the lock
//! itself: the shortest and longest valid code, the first invalid length, and
//! the boundary between "not locked" and "locked".

mod common;

use invoice_currency_lock::{validate_asset_code, CurrencyLockError, MAX_ASSET_CODE_LEN};
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn the_maximum_asset_code_length_is_twelve() {
    assert_eq!(MAX_ASSET_CODE_LEN, 12);
}

#[test]
fn the_shortest_valid_code_is_accepted() {
    assert_eq!(validate_asset_code("A"), Ok(()));
}

#[test]
fn the_longest_valid_code_is_accepted() {
    let code = "A".repeat(MAX_ASSET_CODE_LEN);
    assert_eq!(validate_asset_code(&code), Ok(()));
}

#[test]
fn a_code_one_character_too_long_is_rejected() {
    let code = "A".repeat(MAX_ASSET_CODE_LEN + 1);
    assert_eq!(
        validate_asset_code(&code),
        Err(CurrencyLockError::InvalidAssetCode)
    );
}

#[test]
fn an_empty_code_is_rejected() {
    assert_eq!(
        validate_asset_code(""),
        Err(CurrencyLockError::InvalidAssetCode)
    );
}

#[test]
fn a_code_with_punctuation_is_rejected() {
    assert_eq!(
        validate_asset_code("US-D"),
        Err(CurrencyLockError::InvalidAssetCode)
    );
    assert_eq!(
        validate_asset_code("US D"),
        Err(CurrencyLockError::InvalidAssetCode)
    );
}

#[test]
fn an_underscore_is_not_a_valid_asset_code_character() {
    // `_` is a legal `Symbol` character but not a legal asset-code character.
    assert_eq!(
        validate_asset_code("US_D"),
        Err(CurrencyLockError::InvalidAssetCode)
    );
}

#[test]
fn digits_are_valid_asset_code_characters() {
    assert_eq!(validate_asset_code("1234"), Ok(()));
    assert_eq!(validate_asset_code("1"), Ok(()));
}

#[test]
fn an_unlocked_invoice_is_not_locked_and_asserts_nothing() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    assert!(!client.is_locked(&invoice));
    assert_eq!(client.locked_currency(&invoice), None);
    assert!(!client.assert_currency(&invoice, &usd));
}

#[test]
fn a_code_at_the_length_limit_is_accepted_by_the_contract() {
    let (env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    // 12 characters — the longest legal asset code.
    let longest = Symbol::new(&env, "ABCDEFGHIJKL");

    client.lock_currency(&invoice, &longest);

    assert_eq!(client.locked_currency(&invoice), Some(longest.clone()));
}

#[test]
fn a_code_one_character_too_long_is_rejected_by_the_contract() {
    let (env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    // 13 characters — one past the asset-code limit.
    let too_long = Symbol::new(&env, "ABCDEFGHIJKLM");

    assert_eq!(
        client.try_lock_currency(&invoice, &too_long),
        Err(Ok(CurrencyLockError::InvalidAssetCode))
    );
    assert!(!client.is_locked(&invoice));
}
