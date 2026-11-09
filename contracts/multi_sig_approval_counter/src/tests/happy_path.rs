//! Happy-path tests for `multi-sig-approval-counter`.

use super::{new_signer, setup};
use soroban_sdk::symbol_short;

#[test]
fn unapproved_action_starts_at_false_with_zero_count() {
    let (_env, client) = setup();
    let action = symbol_short!("ACT_1");

    assert!(!client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 0);
    assert_eq!(client.required_for(&action), None);
}

#[test]
fn three_of_three_distinct_approvers_flip_flag_on_third_signer() {
    let (env, client) = setup();
    let action = symbol_short!("REL_100");
    let s1 = new_signer(&env);
    let s2 = new_signer(&env);
    let s3 = new_signer(&env);

    assert!(!client.approve(&action, &s1, &3));
    assert_eq!(client.approval_count(&action), 1);
    assert!(!client.is_approved(&action));

    assert!(!client.approve(&action, &s2, &3));
    assert_eq!(client.approval_count(&action), 2);
    assert!(!client.is_approved(&action));

    assert!(client.approve(&action, &s3, &3));
    assert_eq!(client.approval_count(&action), 3);
    assert!(client.is_approved(&action));
    assert!(client.has_approved(&action, &s1));
    assert!(client.has_approved(&action, &s2));
    assert!(client.has_approved(&action, &s3));
}
