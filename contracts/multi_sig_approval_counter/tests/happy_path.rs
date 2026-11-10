mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn reaches_approval_after_m_distinct_approvers() {
    let (env, client) = setup();
    let action = symbol_short!("ACT1");
    let a1 = Address::generate(&env);
    let a2 = Address::generate(&env);
    let a3 = Address::generate(&env);

    assert!(!client.approve(&action, &a1, &3));
    assert!(!client.approve(&action, &a2, &3));
    assert!(!client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 2);

    assert!(client.approve(&action, &a3, &3));
    assert!(client.is_approved(&action));
    assert_eq!(client.approval_count(&action), 3);
}
