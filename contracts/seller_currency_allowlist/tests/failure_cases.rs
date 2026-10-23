//! Failure-case tests for `seller-currency-allowlist`.
//!
//! Every rejection path: invalid asset codes fail with a stable error and
//! leave the list untouched, and changing an allowlist requires the
//! seller's own authorization.

mod common;

use common::{seller, setup};
use seller_currency_allowlist::{
    validate_asset_code, AllowlistError, SellerCurrencyAllowlist, SellerCurrencyAllowlistClient,
};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};

#[test]
fn an_empty_code_is_rejected() {
    let (env, client) = setup();
    let s = seller(&env);
    let empty = Symbol::new(&env, "");

    assert_eq!(
        client.try_allow_currency(&s, &empty),
        Err(Ok(AllowlistError::InvalidAssetCode))
    );
    assert!(!client.is_allowed_currency(&s, &empty));
}

#[test]
fn codes_longer_than_twelve_characters_are_rejected() {
    let (env, client) = setup();
    let s = seller(&env);
    let too_long = Symbol::new(&env, "ABCDEFGHIJKLM"); // 13 characters

    assert_eq!(
        client.try_allow_currency(&s, &too_long),
        Err(Ok(AllowlistError::InvalidAssetCode))
    );
}

#[test]
fn codes_with_non_alphanumeric_characters_are_rejected() {
    let (env, client) = setup();
    let s = seller(&env);

    // Underscore is the only byte a Soroban Symbol can carry that is not
    // alphanumeric, so it is the illegal-character case reachable through
    // the contract itself.
    for invalid in ["X_LM", "X_LM_XLM2", "_XLM", "XL__M", "USDC_USDTX"] {
        let code = Symbol::new(&env, invalid);
        assert_eq!(
            client.try_allow_currency(&s, &code),
            Err(Ok(AllowlistError::InvalidAssetCode)),
            "code {invalid:?} should be rejected"
        );
        assert!(!client.is_allowed_currency(&s, &code));
    }
}

#[test]
fn codes_with_other_illegal_bytes_are_rejected_by_validation() {
    // Bytes a host Symbol can never carry — spaces, punctuation, any
    // non-ASCII — are rejected by the exact same validation routine the
    // contract runs before it stores anything.
    for invalid in [
        "USDC XLM",      // space
        "USDC.XLM",      // period
        "USDC/XLM",      // slash
        "USDC!XLM",      // punctuation
        "USDC-XLM",      // dash
        "USDC,XLM",      // comma
        "$USDCXLM",      // currency symbol
        "",              // empty
        "ABCDEFGHIJKLM", // 13 characters
    ] {
        assert_eq!(
            validate_asset_code(invalid),
            Err(AllowlistError::InvalidAssetCode),
            "code {invalid:?} should be rejected"
        );
    }
}

#[test]
fn a_non_ascii_code_is_rejected() {
    // Cyrillic "С" looks like the Latin "S" of USDC but is not ASCII, and
    // "Ü" is a Latin U with an umlaut. Host Symbols cannot always carry
    // arbitrary UTF-8, so the rule is exercised through the same free
    // function the contract itself calls before storing anything.
    assert_eq!(
        validate_asset_code("СUDC"),
        Err(AllowlistError::InvalidAssetCode)
    );
    assert_eq!(
        validate_asset_code("ÜSDC"),
        Err(AllowlistError::InvalidAssetCode)
    );
    // The ASCII-only rule is exact: pure ASCII passes, any non-ASCII byte
    // fails.
    assert!(validate_asset_code("SUDC").is_ok());
}

#[test]
fn a_failed_validation_leaves_the_allowlist_unchanged() {
    let (env, client) = setup();
    let s = seller(&env);
    let xlm = symbol_short!("XLM");

    client.allow_currency(&s, &xlm);

    // An invalid attempt against the same seller changes nothing…
    assert_eq!(
        client.try_allow_currency(&s, &Symbol::new(&env, "BAD_CODE")),
        Err(Ok(AllowlistError::InvalidAssetCode))
    );
    // …the valid entry is still there, and the invalid one never arrived.
    assert!(client.is_allowed_currency(&s, &xlm));
    assert!(!client.is_allowed_currency(&s, &Symbol::new(&env, "BADCODE")));
}

#[test]
fn the_error_discriminant_and_message_are_stable() {
    assert_eq!(AllowlistError::InvalidAssetCode as u32, 1);
    assert_eq!(
        AllowlistError::InvalidAssetCode.message(),
        "Asset code must be 1-12 ASCII alphanumeric characters."
    );
}

#[test]
fn changing_an_allowlist_requires_the_sellers_authorization() {
    // A fresh environment with no auth mocking: the seller never signed.
    let env = Env::default();
    let contract_id = env.register(SellerCurrencyAllowlist, ());
    let client = SellerCurrencyAllowlistClient::new(&env, &contract_id);
    let s = Address::generate(&env);
    let xlm = symbol_short!("XLM");

    assert!(client.try_allow_currency(&s, &xlm).is_err());

    // The unauthorized attempt wrote nothing.
    assert!(!client.is_allowed_currency(&s, &xlm));
}

#[test]
fn writes_for_one_seller_preserve_another_sellers_entries() {
    let (env, client) = setup();
    let alice = seller(&env);
    let mallory = seller(&env);
    let xlm = symbol_short!("XLM");

    client.allow_currency(&alice, &xlm);

    // Mallory authorizing her own call only writes Mallory's key, so
    // Alice's existing entry is preserved untouched.
    client.allow_currency(&mallory, &xlm);
    assert!(client.is_allowed_currency(&mallory, &xlm));
    // Alice's list is unchanged (still exactly her own opt-in).
    assert!(client.is_allowed_currency(&alice, &xlm));
}
