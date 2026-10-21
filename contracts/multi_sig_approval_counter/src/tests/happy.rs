use soroban_sdk::{symbol_short, Env};
use super::address;
use crate::{MultiSigApprovalCounter, MultiSigApprovalCounterClient};

#[test]
fn reaches_threshold_with_distinct_approvers() {
    let env = Env::default();
    let addr1 = address(&env);
    let addr2 = address(&env);
    let addr3 = address(&env);
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    let action = symbol_short!("transfer");
    let required = 3u32;

    assert_eq!(client.approval_count(&action), 0);
    assert!(!client.is_approved(&action));

    // First approver
    assert!(!client.approve(&action, &addr1, &required));
    assert_eq!(client.approval_count(&action), 1);
    assert!(!client.is_approved(&action));

    // Second approver
    assert!(!client.approve(&action, &addr2, &required));
    assert_eq!(client.approval_count(&action), 2);
    assert!(!client.is_approved(&action));

    // Third approver flips flag
    assert!(client.approve(&action, &addr3, &required));
    assert_eq!(client.approval_count(&action), 3);
    assert!(client.is_approved(&action));
}
