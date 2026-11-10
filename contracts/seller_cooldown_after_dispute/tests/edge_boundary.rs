mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn exact_unlock_ledger_and_zero_cooldown_boundaries() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    client.flag_dispute(&seller, &200);
    assert!(!client.can_create_invoice(&seller, &209, &10));
    assert!(client.can_create_invoice(&seller, &210, &10));
    assert!(client.can_create_invoice(&seller, &200, &0));
}
