//! Happy-path tests for `invoice-max-count-per-seller`.
//!
//! These cover the successful recording path: a seller receives an increasing
//! count and remaining slots decrease correspondingly.

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn first_record_returns_one() {
    let (env, client) = common::setup(10);
    let seller = Address::generate(&env);

    assert_eq!(client.record_invoice(&seller), 1);
}

#[test]
fn count_increases_by_one_per_call() {
    let (env, client) = common::setup(10);
    let seller = Address::generate(&env);

    assert_eq!(client.record_invoice(&seller), 1);
    assert_eq!(client.record_invoice(&seller), 2);
    assert_eq!(client.record_invoice(&seller), 3);
}

#[test]
fn count_for_tracks_recorded_invoices() {
    let (env, client) = common::setup(10);
    let seller = Address::generate(&env);

    assert_eq!(client.count_for(&seller), 0);
    client.record_invoice(&seller);
    assert_eq!(client.count_for(&seller), 1);
    client.record_invoice(&seller);
    assert_eq!(client.count_for(&seller), 2);
}

#[test]
fn remaining_decreases_per_record() {
    let (env, client) = common::setup(5);
    let seller = Address::generate(&env);

    assert_eq!(client.remaining_for(&seller), 5);
    client.record_invoice(&seller);
    assert_eq!(client.remaining_for(&seller), 4);
    client.record_invoice(&seller);
    assert_eq!(client.remaining_for(&seller), 3);
}

#[test]
fn count_and_remaining_always_sum_to_cap() {
    let cap = 7u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    for _ in 0..cap {
        let count = client.count_for(&seller);
        let remaining = client.remaining_for(&seller);
        assert_eq!(count + remaining, cap);
        client.record_invoice(&seller);
    }
    // After exhausting the cap both count and remaining are at their bounds.
    assert_eq!(client.count_for(&seller), cap);
    assert_eq!(client.remaining_for(&seller), 0);
}

#[test]
fn new_seller_starts_at_zero() {
    let (env, client) = common::setup(10);
    let seller = Address::generate(&env);

    assert_eq!(client.count_for(&seller), 0);
    assert_eq!(client.remaining_for(&seller), 10);
}

#[test]
fn seller_can_fill_entire_cap() {
    let cap = 5u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    for expected in 1..=cap {
        assert_eq!(client.record_invoice(&seller), expected);
    }
    assert_eq!(client.count_for(&seller), cap);
    assert_eq!(client.remaining_for(&seller), 0);
}
