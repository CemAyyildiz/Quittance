//! Edge and boundary tests for `invoice-max-count-per-seller`.
//!
//! These probe the contract at the limits of its domain: cap of 1, very large
//! caps, the exact transition from allowed to rejected, and multiple sellers.

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn cap_of_one_allows_exactly_one_invoice() {
    let (env, client) = common::setup(1);
    let seller = Address::generate(&env);

    assert_eq!(client.record_invoice(&seller), 1);
    assert_eq!(client.remaining_for(&seller), 0);
    assert!(client.try_record_invoice(&seller).is_err());
}

#[test]
fn last_allowed_call_succeeds_first_rejected_call_fails() {
    let cap = 4u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    // Record up to cap - 1.
    for _ in 0..(cap - 1) {
        client.record_invoice(&seller);
    }
    assert_eq!(client.remaining_for(&seller), 1);

    // cap-th call is still allowed.
    assert_eq!(client.record_invoice(&seller), cap);
    assert_eq!(client.remaining_for(&seller), 0);

    // cap+1-th call is the first to be rejected.
    assert!(client.try_record_invoice(&seller).is_err());
}

#[test]
fn large_cap_all_succeed() {
    let cap = 200u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    for expected in 1..=cap {
        assert_eq!(client.record_invoice(&seller), expected);
    }
    assert_eq!(client.count_for(&seller), cap);
}

#[test]
fn two_sellers_are_independent() {
    let cap = 3u32;
    let (env, client) = common::setup(cap);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Exhaust Alice's quota.
    for _ in 0..cap {
        client.record_invoice(&alice);
    }
    assert!(client.try_record_invoice(&alice).is_err());

    // Bob's quota must be completely untouched.
    assert_eq!(client.count_for(&bob), 0);
    assert_eq!(client.remaining_for(&bob), cap);
    assert_eq!(client.record_invoice(&bob), 1);
}

#[test]
fn many_sellers_do_not_interfere() {
    let cap = 5u32;
    let (env, client) = common::setup(cap);

    // Ten independent sellers each record one invoice.
    let sellers: [Address; 10] = core::array::from_fn(|_| Address::generate(&env));
    for s in &sellers {
        assert_eq!(client.record_invoice(s), 1);
    }
    // Each seller still has cap - 1 remaining.
    for s in &sellers {
        assert_eq!(client.count_for(s), 1);
        assert_eq!(client.remaining_for(s), cap - 1);
    }
}

#[test]
fn count_before_any_record_is_zero() {
    let (env, client) = common::setup(10);
    let seller = Address::generate(&env);

    assert_eq!(client.count_for(&seller), 0);
}

#[test]
fn remaining_before_any_record_equals_cap() {
    let cap = 42u32;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    assert_eq!(client.remaining_for(&seller), cap);
}

#[test]
fn cap_of_u32_max_minus_one_allows_correct_remaining() {
    // Just verify the arithmetic works for a very large cap without actually
    // recording u32::MAX invoices.
    let cap = u32::MAX - 1;
    let (env, client) = common::setup(cap);
    let seller = Address::generate(&env);

    client.record_invoice(&seller);
    assert_eq!(client.count_for(&seller), 1);
    assert_eq!(client.remaining_for(&seller), cap - 1);
}
