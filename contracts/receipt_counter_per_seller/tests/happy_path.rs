//! Happy-path tests for `receipt-counter-per-seller`.
//!
//! These cover the successful issuance path: a seller receives an increasing
//! sequence of receipt numbers, and the issued number is what gets stored.

mod common;

use receipt_counter_per_seller::FIRST_RECEIPT_NO;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn first_receipt_number_is_one() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    assert_eq!(client.next_receipt_no(&seller), 1);
    assert_eq!(FIRST_RECEIPT_NO, 1);
}

#[test]
fn receipt_numbers_increase_by_one() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    assert_eq!(client.next_receipt_no(&seller), 1);
    assert_eq!(client.next_receipt_no(&seller), 2);
    assert_eq!(client.next_receipt_no(&seller), 3);
}

#[test]
fn last_receipt_no_tracks_the_issued_number() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    assert_eq!(client.last_receipt_no(&seller), 0);
    client.next_receipt_no(&seller);
    assert_eq!(client.last_receipt_no(&seller), 1);
    client.next_receipt_no(&seller);
    assert_eq!(client.last_receipt_no(&seller), 2);
}

#[test]
fn peek_reports_the_next_number_without_advancing() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    assert_eq!(client.peek_next_receipt_no(&seller), 1);
    // Peeking twice must not consume a number.
    assert_eq!(client.peek_next_receipt_no(&seller), 1);
    assert_eq!(client.last_receipt_no(&seller), 0);

    assert_eq!(client.next_receipt_no(&seller), 1);
    assert_eq!(client.peek_next_receipt_no(&seller), 2);
}

#[test]
fn many_sequential_receipts_stay_consecutive() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    for expected in 1..=25u64 {
        assert_eq!(client.next_receipt_no(&seller), expected);
    }
    assert_eq!(client.last_receipt_no(&seller), 25);
}
