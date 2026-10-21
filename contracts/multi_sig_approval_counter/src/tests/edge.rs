use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{MultiSigApprovalCounter, MultiSigApprovalCounterClient};

#[test]
fn threshold_of_one_approves_immediately() {
    let env = Env::default();
    let approver = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action = symbol_short!("fast_tx");
    assert!(client.approve(&action, &approver, &1));
    assert!(client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 1);
}

#[test]
fn approvals_beyond_threshold_keep_approved_true() {
    let env = Env::default();
    let a1 = address(&env);
    let a2 = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action = symbol_short!("extra_tx");
    assert!(client.approve(&action, &a1, &1));
    assert!(client.is_approved(&action));

    // Another approver after already approved
    assert!(client.approve(&action, &a2, &1));
    assert!(client.is_approved(&action));
}
