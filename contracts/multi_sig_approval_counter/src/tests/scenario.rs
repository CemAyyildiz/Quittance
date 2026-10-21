use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{MultiSigApprovalCounter, MultiSigApprovalCounterClient};

#[test]
fn independent_action_ids_track_distinct_approvals() {
    let env = Env::default();
    let approver_1 = address(&env);
    let approver_2 = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action_a = symbol_short!("action_a");
    let action_b = symbol_short!("action_b");

    client.approve(&action_a, &approver_1, &2);
    assert_eq!(client.approval_count(&action_a), 1);
    assert_eq!(client.approval_count(&action_b), 0);

    client.approve(&action_b, &approver_1, &1);
    assert!(client.is_approved(&action_b));
    assert!(!client.is_approved(&action_a));

    client.approve(&action_a, &approver_2, &2);
    assert!(client.is_approved(&action_a));
}
