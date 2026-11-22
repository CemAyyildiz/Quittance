//! Happy-path tests for `invoice-amount-range`.
//!
//! These cover the successful flow: a seller sets a valid range and amounts
//! within it are accepted while amounts outside it are rejected.

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn amount_inside_range_is_accepted() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &1_000);

    assert!(client.in_range(&seller, &500));
}

#[test]
fn amount_at_min_bound_is_accepted() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &1_000);

    assert!(client.in_range(&seller, &100));
}

#[test]
fn amount_at_max_bound_is_accepted() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &1_000);

    assert!(client.in_range(&seller, &1_000));
}

#[test]
fn amount_below_min_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &1_000);

    assert!(!client.in_range(&seller, &99));
}

#[test]
fn amount_above_max_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &1_000);

    assert!(!client.in_range(&seller, &1_001));
}

#[test]
fn range_can_be_updated() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &100, &500);
    assert!(client.in_range(&seller, &300));
    assert!(!client.in_range(&seller, &600));

    // Update to a wider range.
    client.set_range(&seller, &100, &1_000);
    assert!(client.in_range(&seller, &600));
}

#[test]
fn zero_based_range_works() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &0, &500);

    assert!(client.in_range(&seller, &0));
    assert!(client.in_range(&seller, &250));
    assert!(client.in_range(&seller, &500));
    assert!(!client.in_range(&seller, &501));
}

#[test]
fn no_range_set_allows_any_non_negative_amount() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    // No set_range call at all.
    assert!(client.in_range(&seller, &0));
    assert!(client.in_range(&seller, &1_000_000_000));
    // Negative amounts are never valid denominations.
    assert!(!client.in_range(&seller, &-1));
}
