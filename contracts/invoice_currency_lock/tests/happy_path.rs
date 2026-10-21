//! Happy-path tests for `invoice-currency-lock`.
//!
//! These cover the successful locking path: an invoice is locked to a code,
//! the code can be read back, and the lock can be confirmed.

mod common;

use soroban_sdk::symbol_short;

#[test]
fn an_invoice_can_be_locked_to_a_currency() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.lock_currency(&invoice, &usd);

    assert!(client.is_locked(&invoice));
    assert_eq!(client.locked_currency(&invoice), Some(usd.clone()));
}

#[test]
fn a_locked_invoice_asserts_its_own_currency() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.lock_currency(&invoice, &usd);

    assert!(client.assert_currency(&invoice, &usd));
}

#[test]
fn a_locked_invoice_does_not_assert_a_different_currency() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&invoice, &usd);

    assert!(!client.assert_currency(&invoice, &eur));
}

#[test]
fn locking_the_same_currency_twice_succeeds() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.lock_currency(&invoice, &usd);
    client.lock_currency(&invoice, &usd);

    assert_eq!(client.locked_currency(&invoice), Some(usd.clone()));
    assert!(client.assert_currency(&invoice, &usd));
}

#[test]
fn different_invoices_lock_independently() {
    let (_env, client) = common::setup();
    let first = symbol_short!("INV1");
    let second = symbol_short!("INV2");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&first, &usd);
    client.lock_currency(&second, &eur);

    assert_eq!(client.locked_currency(&first), Some(usd.clone()));
    assert_eq!(client.locked_currency(&second), Some(eur.clone()));
    assert!(client.assert_currency(&first, &usd));
    assert!(client.assert_currency(&second, &eur));
}

#[test]
fn a_lower_case_code_is_accepted() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usdt = symbol_short!("usdt");

    client.lock_currency(&invoice, &usdt);

    assert_eq!(client.locked_currency(&invoice), Some(usdt.clone()));
    assert!(client.assert_currency(&invoice, &usdt));
}

#[test]
fn requiring_the_locked_currency_succeeds() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.lock_currency(&invoice, &usd);

    client.require_currency(&invoice, &usd);
}
