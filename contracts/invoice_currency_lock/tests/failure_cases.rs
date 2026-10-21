//! Failure and error-case tests for `invoice-currency-lock`.
//!
//! These cover the ways the contract can refuse to lock an invoice, and the
//! guarantee that a refused lock leaves no trace behind.

mod common;

use invoice_currency_lock::CurrencyLockError;
use soroban_sdk::symbol_short;

#[test]
fn the_error_discriminants_are_stable() {
    assert_eq!(CurrencyLockError::InvalidAssetCode as u32, 1);
    assert_eq!(CurrencyLockError::CurrencyMismatch as u32, 2);
    assert_eq!(CurrencyLockError::InvoiceNotLocked as u32, 3);
}

#[test]
fn the_error_messages_are_stable() {
    assert_eq!(
        CurrencyLockError::InvalidAssetCode.message(),
        "Asset code must be 1-12 alphanumeric characters."
    );
    assert_eq!(
        CurrencyLockError::CurrencyMismatch.message(),
        "Invoice is already locked to a different asset code."
    );
    assert_eq!(
        CurrencyLockError::InvoiceNotLocked.message(),
        "Invoice has no currency lock."
    );
}

#[test]
fn changing_the_currency_of_a_locked_invoice_is_rejected() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&invoice, &usd);

    assert_eq!(
        client.try_lock_currency(&invoice, &eur),
        Err(Ok(CurrencyLockError::CurrencyMismatch))
    );
}

#[test]
fn a_rejected_currency_change_preserves_the_original_lock() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&invoice, &usd);
    let _ = client.try_lock_currency(&invoice, &eur);

    assert_eq!(client.locked_currency(&invoice), Some(usd.clone()));
    assert!(client.assert_currency(&invoice, &usd));
    assert!(!client.assert_currency(&invoice, &eur));
}

#[test]
fn an_invalid_asset_code_is_rejected() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    // `_` is a legal `Symbol` character but not a legal asset-code character.
    let invalid = symbol_short!("US_D");

    assert_eq!(
        client.try_lock_currency(&invoice, &invalid),
        Err(Ok(CurrencyLockError::InvalidAssetCode))
    );
    assert!(!client.is_locked(&invoice));
    assert_eq!(client.locked_currency(&invoice), None);
}

#[test]
fn a_rejected_lock_leaves_the_invoice_unlocked() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let invalid = symbol_short!("US_D");

    let _ = client.try_lock_currency(&invoice, &invalid);

    assert!(!client.is_locked(&invoice));
    assert!(!client.assert_currency(&invoice, &invalid));
}

#[test]
fn requiring_a_currency_on_an_unlocked_invoice_fails() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    assert_eq!(
        client.try_require_currency(&invoice, &usd),
        Err(Ok(CurrencyLockError::InvoiceNotLocked))
    );
}

#[test]
fn requiring_a_different_currency_fails_with_a_mismatch() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&invoice, &usd);

    assert_eq!(
        client.try_require_currency(&invoice, &eur),
        Err(Ok(CurrencyLockError::CurrencyMismatch))
    );
}
