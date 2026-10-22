//! Multi-seller scenario tests for `invoice-amount-range`.
//!
//! These verify the key concept of this contract: each seller owns a
//! completely independent range, and changes to one seller's range never
//! affect another's.

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn two_sellers_have_independent_ranges() {
    let (env, client) = common::setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.set_range(&alice, &100, &500);
    client.set_range(&bob, &1_000, &5_000);

    // Alice's range.
    assert!(client.in_range(&alice, &300));
    assert!(!client.in_range(&alice, &600));

    // Bob's range.
    assert!(client.in_range(&bob, &3_000));
    assert!(!client.in_range(&bob, &500));
}

#[test]
fn updating_one_seller_range_does_not_affect_others() {
    let (env, client) = common::setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.set_range(&alice, &100, &500);
    client.set_range(&bob, &100, &500);

    // Widen Alice's range.
    client.set_range(&alice, &100, &10_000);

    assert!(client.in_range(&alice, &8_000));
    // Bob's range must be unchanged.
    assert!(!client.in_range(&bob, &8_000));
    assert!(client.in_range(&bob, &300));
}

#[test]
fn many_sellers_all_independent() {
    let (env, client) = common::setup();

    // Ten sellers each get a distinct range [i*100, i*100+50].
    let sellers: [Address; 10] = core::array::from_fn(|_| Address::generate(&env));
    for (i, seller) in sellers.iter().enumerate() {
        let base = (i as i128 + 1) * 100;
        client.set_range(seller, &base, &(base + 50));
    }

    for (i, seller) in sellers.iter().enumerate() {
        let base = (i as i128 + 1) * 100;
        // Midpoint of the range must be accepted.
        assert!(client.in_range(seller, &(base + 25)));
        // One stroop above the cap must be rejected.
        assert!(!client.in_range(seller, &(base + 51)));
    }
}

#[test]
fn seller_without_range_is_unconstrained_while_others_are_restricted() {
    let (env, client) = common::setup();
    let restricted = Address::generate(&env);
    let open = Address::generate(&env);

    client.set_range(&restricted, &1_000, &2_000);

    // `restricted` only accepts 1_000–2_000.
    assert!(!client.in_range(&restricted, &500));
    assert!(client.in_range(&restricted, &1_500));

    // `open` has no range — accepts any non-negative amount.
    assert!(client.in_range(&open, &500));
    assert!(client.in_range(&open, &999_999_999));
}

#[test]
fn overlapping_ranges_across_sellers_remain_distinct() {
    let (env, client) = common::setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    // Both overlap in [200, 300].
    client.set_range(&alice, &100, &300);
    client.set_range(&bob, &200, &400);

    // Overlap region: accepted by both.
    assert!(client.in_range(&alice, &250));
    assert!(client.in_range(&bob, &250));

    // Alice only: 100–199.
    assert!(client.in_range(&alice, &150));
    assert!(!client.in_range(&bob, &150));

    // Bob only: 301–400.
    assert!(client.in_range(&bob, &350));
    assert!(!client.in_range(&alice, &350));
}

#[test]
fn clearing_via_update_and_checking_fresh_seller() {
    let (env, client) = common::setup();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);  // never sets a range

    client.set_range(&alice, &500, &1_000);

    // Alice was restricted; narrow it further.
    client.set_range(&alice, &700, &900);
    assert!(!client.in_range(&alice, &500));
    assert!(client.in_range(&alice, &800));

    // Bob never set a range, stays open.
    assert!(client.in_range(&bob, &500));
    assert!(client.in_range(&bob, &1));
    assert!(!client.in_range(&bob, &-1));
}
