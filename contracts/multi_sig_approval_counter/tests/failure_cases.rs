mod common;

use common::setup;
use multi_sig_approval_counter::ApprovalError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn rejects_zero_or_inconsistent_required_thresholds() {
    let (env, client) = setup();
    let action = symbol_short!("ACT3");
    let a1 = Address::generate(&env);
    let a2 = Address::generate(&env);

    assert_eq!(
        client.try_approve(&action, &a1, &0),
        Err(Ok(ApprovalError::InvalidRequiredThreshold))
    );

    client.approve(&action, &a1, &2);
    assert_eq!(
        client.try_approve(&action, &a2, &3),
        Err(Ok(ApprovalError::ThresholdMismatch))
    );
}
