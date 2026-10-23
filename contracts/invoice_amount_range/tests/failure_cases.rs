//! Failure and error-case tests for `invoice-amount-range`.
//!
//! These cover every way `set_range` can refuse an invalid configuration.

mod common;

use invoice_amount_range::RangeError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn inverted_range_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let result = client.try_set_range(&seller, &1_000, &100);
    assert!(result.is_err());
}

#[test]
fn negative_min_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let result = client.try_set_range(&seller, &-1, &100);
    assert!(result.is_err());
}

#[test]
fn negative_max_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let result = client.try_set_range(&seller, &0, &-1);
    assert!(result.is_err());
}

#[test]
fn both_negative_bounds_are_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    let result = client.try_set_range(&seller, &-100, &-10);
    assert!(result.is_err());
}

#[test]
fn failed_set_range_leaves_previous_range_intact() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    // Set a good range first.
    client.set_range(&seller, &100, &500);
    assert!(client.in_range(&seller, &300));

    // Attempt to overwrite with an invalid range — must fail.
    let _ = client.try_set_range(&seller, &500, &100);

    // Original range must still be in effect.
    assert!(client.in_range(&seller, &300));
    assert!(!client.in_range(&seller, &600));
}

#[test]
fn error_discriminant_is_stable() {
    assert_eq!(RangeError::InvalidRange as u32, 1);
}

#[test]
fn error_message_is_stable() {
    assert_eq!(
        RangeError::InvalidRange.message(),
        "Range is invalid: min must be <= max and both must be non-negative."
    );
}

#[test]
fn amount_just_below_min_after_update_is_rejected() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);

    client.set_range(&seller, &50, &200);
    // Update raises the min; the old min must no longer pass.
    client.set_range(&seller, &100, &200);

    assert!(!client.in_range(&seller, &50));
    assert!(client.in_range(&seller, &100));
}
