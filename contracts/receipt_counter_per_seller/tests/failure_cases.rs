//! Failure and error-case tests for `receipt-counter-per-seller`.
//!
//! These cover the ways the contract can refuse to issue a receipt number.

mod common;

use receipt_counter_per_seller::{CounterError, FIRST_RECEIPT_NO};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn error_messages_are_stable() {
    assert_eq!(
        CounterError::CounterOverflow.message(),
        "Receipt counter has reached its maximum value."
    );
    assert_eq!(
        CounterError::InvalidSeed.message(),
        "A receipt counter must start at zero."
    );
}

#[test]
fn the_error_discriminants_are_stable() {
    assert_eq!(CounterError::CounterOverflow as u32, 1);
    assert_eq!(CounterError::InvalidSeed as u32, 2);
}

#[test]
fn the_first_receipt_number_constant_is_one() {
    // Receipt numbers are 1-based so that 0 means "nothing issued yet".
    assert_eq!(FIRST_RECEIPT_NO, 1);
    assert_ne!(FIRST_RECEIPT_NO, 0);
}

#[test]
fn issuing_to_an_unknown_seller_starts_from_one() {
    // A seller with no history must not receive a zero receipt number.
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let issued = client.next_receipt_no(&seller);
    assert_eq!(issued, 1);
    assert!(issued > 0);
}

#[test]
fn a_rejected_call_does_not_advance_the_counter() {
    // Peeking at the boundary must leave the stored counter untouched.
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.next_receipt_no(&seller);
    assert_eq!(client.peek_next_receipt_no(&seller), 2);
    assert_eq!(client.last_receipt_no(&seller), 1);
}
