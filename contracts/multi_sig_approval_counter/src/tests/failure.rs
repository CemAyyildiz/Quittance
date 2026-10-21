use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{MultiSigApprovalCounter, MultiSigApprovalCounterClient};

#[test]
fn repeated_approvals_from_same_address_do_not_count_twice() {
    let env = Env::default();
    let approver = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action = symbol_short!("repeat");
    let required = 2u32;

    assert!(!client.approve(&action, &approver, &required));
    assert_eq!(client.approval_count(&action), 1);
    assert!(client.has_approved(&action, &approver));

    // Same address attempts repeated approval: returns false and count does not increment
    assert!(!client.approve(&action, &approver, &required));
    assert_eq!(client.approval_count(&action), 1);
    assert!(!client.is_approved(&action));
}

#[test]
#[should_panic]
fn zero_threshold_panics() {
    let env = Env::default();
    let approver = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action = symbol_short!("zero_th");
    client.approve(&action, &approver, &0);
}
