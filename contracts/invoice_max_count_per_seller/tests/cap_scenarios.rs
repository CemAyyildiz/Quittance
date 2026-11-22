//! Cap scenario tests for `invoice-max-count-per-seller`.
//!
//! These cover scenarios specific to the lifetime-cap concept: interleaved
//! recording across sellers, partial exhaustion, reading counts/remaining for
//! sellers that have never recorded, and verifying cap immutability.

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn interleaved_records_across_sellers_stay_independent() {
    let cap = 4u32;
    let (env, client) = common::setup(cap);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Interleave recording between Alice and Bob.
    assert_eq!(client.record_invoice(&alice), 1);
    assert_eq!(client.record_invoice(&bob), 1);
    assert_eq!(client.record_invoice(&alice), 2);
    assert_eq!(client.record_invoice(&bob), 2);
    assert_eq!(client.record_invoice(&alice), 3);
    assert_eq!(client.record_invoice(&bob), 3);

    // Each sees their own independent state.
    assert_eq!(client.count_for(&alice), 3);
    assert_eq!(client.count_for(&bob), 3);
    assert_eq!(client.remaining_for(&alice), 1);
    assert_eq!(client.remaining_for(&bob), 1);
}

#[test]
fn partial_exhaustion_then_fresh_seller() {
    let cap = 5u32;
    let (env, client) = common::setup(cap);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Alice uses 3 out of 5.
    client.record_invoice(&alice);
    client.record_invoice(&alice);
    client.record_invoice(&alice);
    assert_eq!(client.count_for(&alice), 3);
    assert_eq!(client.remaining_for(&alice), 2);

    // Bob has never touched the contract — full quota available.
    assert_eq!(client.count_for(&bob), 0);
    assert_eq!(client.remaining_for(&bob), cap);
}

#[test]
fn unknown_seller_count_is_zero_without_record() {
    let (env, client) = common::setup(10);
    let stranger = Address::generate(&env);

    // Querying a seller that has never recorded must not create storage or
    // return non-zero.
    assert_eq!(client.count_for(&stranger), 0);
    assert_eq!(client.remaining_for(&stranger), 10);
    // A second query must return the same values.
    assert_eq!(client.count_for(&stranger), 0);
    assert_eq!(client.remaining_for(&stranger), 10);
}

#[test]
fn exactly_at_cap_remaining_is_zero() {
    let cap = 3u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    for _ in 0..cap {
        client.record_invoice(&seller);
    }

    assert_eq!(client.remaining_for(&seller), 0);
    assert_eq!(client.count_for(&seller), cap);
}

#[test]
fn one_seller_exhausted_others_unaffected() {
    let cap = 2u32;
    let (env, client) = common::setup(cap);

    let exhausted = Address::generate(&env);
    let fresh_a = Address::generate(&env);
    let fresh_b = Address::generate(&env);

    // Exhaust one seller.
    client.record_invoice(&exhausted);
    client.record_invoice(&exhausted);
    assert!(client.try_record_invoice(&exhausted).is_err());

    // Unrelated sellers are unaffected.
    assert_eq!(client.remaining_for(&fresh_a), cap);
    assert_eq!(client.remaining_for(&fresh_b), cap);
    assert_eq!(client.record_invoice(&fresh_a), 1);
    assert_eq!(client.record_invoice(&fresh_b), 1);
}

#[test]
fn count_and_remaining_are_consistent_throughout_lifecycle() {
    let cap = 6u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    for i in 0..cap {
        let before_count = client.count_for(&seller);
        let before_rem = client.remaining_for(&seller);
        assert_eq!(before_count, i);
        assert_eq!(before_rem, cap - i);
        assert_eq!(before_count + before_rem, cap);

        client.record_invoice(&seller);
    }

    // At cap: count == cap, remaining == 0.
    assert_eq!(client.count_for(&seller), cap);
    assert_eq!(client.remaining_for(&seller), 0);
}

#[test]
fn cap_applies_per_seller_not_globally() {
    // Each of five sellers can independently reach the cap.
    let cap = 3u32;
    let (env, client) = common::setup(cap);

    let sellers: [Address; 5] = core::array::from_fn(|_| Address::generate(&env));

    for seller in &sellers {
        for expected in 1..=cap {
            assert_eq!(client.record_invoice(seller), expected);
        }
        // Each individual seller should now be at cap.
        assert_eq!(client.count_for(seller), cap);
        assert_eq!(client.remaining_for(seller), 0);
        assert!(client.try_record_invoice(seller).is_err());
    }
}
