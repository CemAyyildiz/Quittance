mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn duplicate_approval_from_same_address_is_ignored() {
    let (env, client) = setup();
    let action = symbol_short!("ACT2");
    let a1 = Address::generate(&env);
    let a2 = Address::generate(&env);

    assert!(!client.approve(&action, &a1, &2));
    assert!(!client.approve(&action, &a1, &2));
    assert_eq!(client.approval_count(&action), 1);
    assert!(client.has_approved(&action, &a1));

    assert!(client.approve(&action, &a2, &2));
    assert!(client.is_approved(&action));
}
