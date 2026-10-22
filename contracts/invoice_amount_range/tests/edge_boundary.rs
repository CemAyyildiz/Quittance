//! Edge and boundary tests for `invoice-amount-range`.
//!
//! These probe the contract at the limits of its domain: degenerate ranges,
//! very large values, off-by-one transitions, and the border between
//! "no range set" and "range set to [0, 0]".

mod common;

use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn single_point_range_accepts_only_that_value() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &42, &42);

    assert!(client.in_range(&seller, &42));
    assert!(!client.in_range(&seller, &41));
    assert!(!client.in_range(&seller, &43));
}

#[test]
fn zero_zero_range_accepts_only_zero() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &0, &0);

    assert!(client.in_range(&seller, &0));
    assert!(!client.in_range(&seller, &1));
}

#[test]
fn off_by_one_below_min() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &10, &20);

    assert!(!client.in_range(&seller, &9));
    assert!(client.in_range(&seller, &10));
}

#[test]
fn off_by_one_above_max() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &10, &20);

    assert!(client.in_range(&seller, &20));
    assert!(!client.in_range(&seller, &21));
}

#[test]
fn very_large_range_works() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let big = i128::MAX / 2;
    client.set_range(&seller, &0, &big);

    assert!(client.in_range(&seller, &0));
    assert!(client.in_range(&seller, &big));
    assert!(!client.in_range(&seller, &(big + 1)));
}

#[test]
fn no_range_set_rejects_negative_amount() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    // Without a range, negative amounts must still be rejected.
    assert!(!client.in_range(&seller, &-1));
    assert!(!client.in_range(&seller, &i128::MIN));
}

#[test]
fn no_range_set_vs_zero_zero_range_differ_for_nonzero() {
    let (env, client) = common::setup();
    let unconstrained = Address::generate(&env);
    let constrained = Address::generate(&env);

    // unconstrained has no range — accepts any non-negative.
    assert!(client.in_range(&unconstrained, &1));

    // constrained is pinned to exactly 0.
    client.set_range(&constrained, &0, &0);
    assert!(!client.in_range(&constrained, &1));
}

#[test]
fn range_update_shrinks_window_correctly() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    // Wide range first.
    client.set_range(&seller, &0, &1_000);
    assert!(client.in_range(&seller, &999));

    // Shrink to a narrow band.
    client.set_range(&seller, &400, &600);
    assert!(!client.in_range(&seller, &999));
    assert!(client.in_range(&seller, &400));
    assert!(client.in_range(&seller, &600));
}

#[test]
fn stroop_amounts_work() {
    // 1 XLM == 10_000_000 stroops; use realistic Stellar amounts.
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let one_xlm = 10_000_000i128;
    let ten_xlm = 100_000_000i128;

    client.set_range(&seller, &one_xlm, &ten_xlm);

    assert!(client.in_range(&seller, &one_xlm));
    assert!(client.in_range(&seller, &ten_xlm));
    assert!(client.in_range(&seller, &50_000_000));    // 5 XLM
    assert!(!client.in_range(&seller, &9_999_999));   // 1 stroop below 1 XLM
    assert!(!client.in_range(&seller, &100_000_001)); // 1 stroop above 10 XLM
}
