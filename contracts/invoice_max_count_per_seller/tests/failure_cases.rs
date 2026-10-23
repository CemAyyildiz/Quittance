//! Failure and error-case tests for `invoice-max-count-per-seller`.
//!
//! These cover every way the contract can refuse to record an invoice.

mod common;

use invoice_max_count_per_seller::InvoiceCapError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn record_fails_when_cap_is_reached() {
    let cap = 3u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    // Fill the cap.
    for _ in 0..cap {
        client.record_invoice(&seller);
    }

    // The next attempt must fail.
    let result = client.try_record_invoice(&seller);
    assert!(result.is_err());
}

#[test]
fn count_is_unchanged_after_rejected_record() {
    let cap = 2u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    client.record_invoice(&seller);
    client.record_invoice(&seller);

    // Rejected call must not mutate the stored count.
    let _ = client.try_record_invoice(&seller);
    assert_eq!(client.count_for(&seller), 2);
}

#[test]
fn remaining_is_zero_after_cap_reached() {
    let cap = 2u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    client.record_invoice(&seller);
    client.record_invoice(&seller);

    assert_eq!(client.remaining_for(&seller), 0);
}

#[test]
fn error_discriminants_are_stable() {
    assert_eq!(InvoiceCapError::CapExceeded as u32, 1);
    assert_eq!(InvoiceCapError::ZeroCap as u32, 2);
}

#[test]
fn error_messages_are_stable() {
    assert_eq!(
        InvoiceCapError::CapExceeded.message(),
        "Seller has reached the lifetime invoice cap."
    );
    assert_eq!(
        InvoiceCapError::ZeroCap.message(),
        "Invoice cap must be greater than zero."
    );
}

#[test]
fn multiple_rejected_calls_do_not_corrupt_state() {
    let cap = 1u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    client.record_invoice(&seller);

    // Three rejected calls in a row.
    let _ = client.try_record_invoice(&seller);
    let _ = client.try_record_invoice(&seller);
    let _ = client.try_record_invoice(&seller);

    // State must still be exactly what it was after the single successful call.
    assert_eq!(client.count_for(&seller), 1);
    assert_eq!(client.remaining_for(&seller), 0);
}

#[test]
fn cap_of_one_allows_only_one_invoice() {
    let (env, client) = common::setup(1);
    let seller = Address::generate(&env);

    assert_eq!(client.record_invoice(&seller), 1);
    assert!(client.try_record_invoice(&seller).is_err());
}
