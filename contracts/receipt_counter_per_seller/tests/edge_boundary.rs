//! Edge and boundary-case tests for `receipt-counter-per-seller`.
//!
//! These cover the exact edges of the sequence: the first receipt, the
//! `u64::MAX` boundary, and the boundary between "nothing issued yet" and
//! "one receipt issued".

mod common;

use receipt_counter_per_seller::{next_after, upcoming, validate_seed, CounterError};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn a_fresh_seller_reports_zero_as_last_issued() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    assert_eq!(client.last_receipt_no(&seller), 0);
}

#[test]
fn zero_is_a_valid_seed() {
    assert_eq!(validate_seed(0), Ok(()));
}

#[test]
fn a_non_zero_seed_is_rejected() {
    assert_eq!(validate_seed(1), Err(CounterError::InvalidSeed));
    assert_eq!(validate_seed(u64::MAX), Err(CounterError::InvalidSeed));
}

#[test]
fn next_after_zero_is_one() {
    assert_eq!(next_after(0), Ok(1));
}

#[test]
fn next_after_the_maximum_overflows() {
    assert_eq!(next_after(u64::MAX), Err(CounterError::CounterOverflow));
}

#[test]
fn next_after_one_below_the_maximum_succeeds() {
    assert_eq!(next_after(u64::MAX - 1), Ok(u64::MAX));
}

#[test]
fn upcoming_reports_the_value_about_to_be_issued() {
    assert_eq!(upcoming(0), Ok(1));
    assert_eq!(upcoming(41), Ok(42));
}

#[test]
fn upcoming_overflows_at_the_maximum() {
    assert_eq!(upcoming(u64::MAX), Err(CounterError::CounterOverflow));
}

#[test]
fn two_sellers_at_the_same_boundary_stay_independent() {
    let (env, client) = common::setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    assert_eq!(client.next_receipt_no(&a), 1);
    assert_eq!(client.next_receipt_no(&a), 2);
    assert_eq!(client.next_receipt_no(&b), 1);
    assert_eq!(client.last_receipt_no(&a), 2);
    assert_eq!(client.last_receipt_no(&b), 1);
}
