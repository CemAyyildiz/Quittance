//! Scenario tests for `invoice-currency-lock`.
//!
//! These cover the behaviour that matters in a real invoice flow: many
//! invoices locking side by side, a currency change attempt leaving the
//! invoice usable, and separate contract instances keeping separate locks.

mod common;

use invoice_currency_lock::{CurrencyLockError, InvoiceCurrencyLock, InvoiceCurrencyLockClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn many_invoices_lock_side_by_side() {
    let (_env, client) = common::setup();
    let codes = [
        symbol_short!("USD"),
        symbol_short!("EUR"),
        symbol_short!("USDT"),
    ];
    let invoices = [
        symbol_short!("INV1"),
        symbol_short!("INV2"),
        symbol_short!("INV3"),
    ];

    for (invoice, code) in invoices.iter().zip(codes.iter()) {
        client.lock_currency(invoice, code);
    }

    for (invoice, code) in invoices.iter().zip(codes.iter()) {
        assert_eq!(client.locked_currency(invoice), Some(code.clone()));
        assert!(client.assert_currency(invoice, code));
    }
}

#[test]
fn a_rejected_currency_change_leaves_the_invoice_payable() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    client.lock_currency(&invoice, &usd);
    let _ = client.try_lock_currency(&invoice, &eur);

    // The invoice still settles in its original currency.
    assert!(client.assert_currency(&invoice, &usd));
    assert_eq!(client.locked_currency(&invoice), Some(usd.clone()));
}

#[test]
fn a_retried_lock_does_not_duplicate_or_reset_the_lock() {
    let (_env, client) = common::setup();
    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");

    client.lock_currency(&invoice, &usd);
    for _ in 0..3 {
        client.lock_currency(&invoice, &usd);
    }

    assert_eq!(client.locked_currency(&invoice), Some(usd.clone()));
    assert!(client.assert_currency(&invoice, &usd));
}

#[test]
fn two_contract_instances_keep_independent_locks() {
    let env = Env::default();
    env.mock_all_auths();

    let a_id = env.register(InvoiceCurrencyLock, ());
    let b_id = env.register(InvoiceCurrencyLock, ());
    let a = InvoiceCurrencyLockClient::new(&env, &a_id);
    let b = InvoiceCurrencyLockClient::new(&env, &b_id);

    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    a.lock_currency(&invoice, &usd);

    assert_eq!(a.locked_currency(&invoice), Some(usd.clone()));
    assert_eq!(b.locked_currency(&invoice), None);
    assert!(a.assert_currency(&invoice, &usd));
    assert!(!b.assert_currency(&invoice, &usd));

    // The second instance has no lock yet, so it can still be locked.
    b.lock_currency(&invoice, &eur);
    assert_eq!(b.locked_currency(&invoice), Some(eur.clone()));
}

#[test]
fn a_mismatch_in_one_instance_says_nothing_about_the_other() {
    let env = Env::default();
    env.mock_all_auths();

    let a_id = env.register(InvoiceCurrencyLock, ());
    let b_id = env.register(InvoiceCurrencyLock, ());
    let a = InvoiceCurrencyLockClient::new(&env, &a_id);
    let b = InvoiceCurrencyLockClient::new(&env, &b_id);

    let invoice = symbol_short!("INV1");
    let usd = symbol_short!("USD");
    let eur = symbol_short!("EUR");

    a.lock_currency(&invoice, &usd);
    assert_eq!(
        a.try_lock_currency(&invoice, &eur),
        Err(Ok(CurrencyLockError::CurrencyMismatch))
    );

    b.lock_currency(&invoice, &eur);
    assert_eq!(b.locked_currency(&invoice), Some(eur.clone()));
    assert!(b.assert_currency(&invoice, &eur));
}

#[test]
fn locking_many_invoices_to_one_currency_keeps_them_distinct() {
    let (_env, client) = common::setup();
    let usd = symbol_short!("USD");
    let invoices = [
        symbol_short!("INV1"),
        symbol_short!("INV2"),
        symbol_short!("INV3"),
        symbol_short!("INV4"),
    ];

    for invoice in invoices.iter() {
        client.lock_currency(invoice, &usd);
    }

    for invoice in invoices.iter() {
        assert!(client.is_locked(invoice));
        assert!(client.assert_currency(invoice, &usd));
    }
}
