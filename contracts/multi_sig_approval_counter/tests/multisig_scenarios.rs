mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn isolates_approvals_across_distinct_actions() {
    let (env, client) = setup();
    let act_a = symbol_short!("ACTA");
    let act_b = symbol_short!("ACTB");
    let signer = Address::generate(&env);

    assert!(client.approve(&act_a, &signer, &1));
    assert!(client.is_approved(&act_a));
    assert!(!client.is_approved(&act_b));
    assert_eq!(client.approval_count(&act_b), 0);
}
