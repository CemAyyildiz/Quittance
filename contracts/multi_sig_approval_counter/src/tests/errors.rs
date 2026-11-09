//! Failure and security tests for `multi-sig-approval-counter`.

use super::{new_signer, setup, setup_unauthed};
use crate::ApprovalError;
use soroban_sdk::symbol_short;

#[test]
fn zero_required_threshold_is_rejected() {
    let (env, client) = setup();
    let action = symbol_short!("ZERO_REQ");
    let signer = new_signer(&env);

    assert!(!client.approve(&action, &signer, &0));
    assert!(!client.is_approved(&action));
    assert_eq!(
        client.try_approve_checked(&action, &signer, &0),
        Err(Ok(ApprovalError::InvalidThreshold))
    );
}

#[test]
fn cannot_lower_threshold_on_subsequent_approval_calls() {
    let (env, client) = setup();
    let action = symbol_short!("LOCK_REQ");
    let alice = new_signer(&env);
    let bob = new_signer(&env);

    assert!(!client.approve(&action, &alice, &3));
    assert_eq!(client.required_for(&action), Some(3));

    assert!(!client.approve(&action, &bob, &2));
    assert!(!client.is_approved(&action));
    assert_eq!(client.required_for(&action), Some(3));

    assert_eq!(
        client.try_approve_checked(&action, &bob, &2),
        Err(Ok(ApprovalError::ThresholdMismatch))
    );
    assert!(!ApprovalError::InvalidThreshold.message().is_empty());
    assert!(!ApprovalError::ThresholdMismatch.message().is_empty());
}

#[test]
fn unauthenticated_approval_is_rejected_by_host() {
    let (env, client) = setup_unauthed();
    let action = symbol_short!("UNAUTH");
    let signer = new_signer(&env);

    assert!(client.try_approve(&action, &signer, &1).is_err());
}
