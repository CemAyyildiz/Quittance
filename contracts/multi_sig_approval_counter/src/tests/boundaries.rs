//! Edge and boundary tests for `multi-sig-approval-counter`.

use super::{new_signer, setup};
use soroban_sdk::symbol_short;

#[test]
fn one_of_one_threshold_flips_immediately_on_first_approval() {
    let (env, client) = setup();
    let action = symbol_short!("ONE_SIG");
    let signer = new_signer(&env);

    assert!(client.approve(&action, &signer, &1));
    assert!(client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 1);
}

#[test]
fn duplicate_approvals_from_same_address_never_count_twice() {
    let (env, client) = setup();
    let action = symbol_short!("DUP_ACT");
    let alice = new_signer(&env);
    let bob = new_signer(&env);

    assert!(!client.approve(&action, &alice, &2));
    assert!(!client.approve(&action, &alice, &2));
    assert!(!client.approve(&action, &alice, &2));
    assert_eq!(client.approval_count(&action), 1);
    assert!(!client.is_approved(&action));

    assert!(client.approve(&action, &bob, &2));
    assert_eq!(client.approval_count(&action), 2);
    assert!(client.is_approved(&action));
}

#[test]
fn additional_approvals_after_threshold_keep_action_approved() {
    let (env, client) = setup();
    let action = symbol_short!("TWO_OF_3");
    let s1 = new_signer(&env);
    let s2 = new_signer(&env);
    let s3 = new_signer(&env);

    assert!(!client.approve(&action, &s1, &2));
    assert!(client.approve(&action, &s2, &2));
    assert!(client.is_approved(&action));

    assert!(client.approve(&action, &s3, &2));
    assert!(client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 3);
}
