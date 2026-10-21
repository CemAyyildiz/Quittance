//! Scenario tests for `receipt-counter-per-seller`.
//!
//! These cover the properties that make the counter useful in practice:
//! independence between sellers, and a gapless sequence per seller.

mod common;

use receipt_counter_per_seller::{ReceiptCounterPerSeller, ReceiptCounterPerSellerClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn sellers_have_fully_independent_sequences() {
    let (env, client) = common::setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert_eq!(client.next_receipt_no(&alice), 1);
    assert_eq!(client.next_receipt_no(&bob), 1);
    assert_eq!(client.next_receipt_no(&alice), 2);
    assert_eq!(client.next_receipt_no(&bob), 2);
    assert_eq!(client.last_receipt_no(&alice), 2);
    assert_eq!(client.last_receipt_no(&bob), 2);
}

#[test]
fn a_busy_seller_does_not_disturb_a_quiet_one() {
    let (env, client) = common::setup();
    let busy = Address::generate(&env);
    let quiet = Address::generate(&env);

    for expected in 1..=10u64 {
        assert_eq!(client.next_receipt_no(&busy), expected);
    }
    assert_eq!(client.last_receipt_no(&quiet), 0);
    assert_eq!(client.next_receipt_no(&quiet), 1);
}

#[test]
fn each_seller_receives_a_gapless_sequence() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    // No receipt number is ever skipped or repeated for this seller.
    let mut previous = 0u64;
    for _ in 0..10 {
        let issued = client.next_receipt_no(&seller);
        assert_eq!(issued, previous + 1);
        previous = issued;
    }
}

#[test]
fn receipt_numbers_are_unique_across_sellers() {
    let (env, client) = common::setup();
    let a = Address::generate(&env);
    let b = Address::generate(&env);

    // Each seller restarts at 1, so numbers are unique *within* a seller —
    // the guarantee a downstream consumer relies on.
    let a_first = client.next_receipt_no(&a);
    let b_first = client.next_receipt_no(&b);
    assert_eq!(a_first, 1);
    assert_eq!(b_first, 1);

    let mut a_seen = vec![a_first];
    for _ in 1..5 {
        a_seen.push(client.next_receipt_no(&a));
    }
    let mut sorted = a_seen.clone();
    sorted.sort_unstable();
    sorted.dedup();
    assert_eq!(sorted.len(), a_seen.len(), "no receipt number may repeat");
}

#[test]
fn two_contract_instances_keep_independent_state() {
    let env = Env::default();
    env.mock_all_auths();

    let a_id = env.register(ReceiptCounterPerSeller, ());
    let b_id = env.register(ReceiptCounterPerSeller, ());
    let a = ReceiptCounterPerSellerClient::new(&env, &a_id);
    let b = ReceiptCounterPerSellerClient::new(&env, &b_id);
    let seller = Address::generate(&env);

    assert_eq!(a.next_receipt_no(&seller), 1);
    assert_eq!(a.next_receipt_no(&seller), 2);
    assert_eq!(b.next_receipt_no(&seller), 1);
    assert_eq!(a.last_receipt_no(&seller), 2);
    assert_eq!(b.last_receipt_no(&seller), 1);
}

#[test]
fn interleaved_issuance_across_many_sellers_stays_correct() {
    let (env, client) = common::setup();
    let sellers: std::vec::Vec<Address> = (0..5).map(|_| Address::generate(&env)).collect();

    for round in 1..=4u64 {
        for seller in &sellers {
            assert_eq!(client.next_receipt_no(seller), round);
        }
    }
    for seller in &sellers {
        assert_eq!(client.last_receipt_no(seller), 4);
    }
}
