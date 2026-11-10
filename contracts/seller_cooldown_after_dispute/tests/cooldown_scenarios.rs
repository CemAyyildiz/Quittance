mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn subsequent_dispute_extends_cooldown_window() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    client.flag_dispute(&seller, &100);
    client.flag_dispute(&seller, &130);
    assert_eq!(client.last_dispute_ledger(&seller), Some(130));
    assert!(!client.can_create_invoice(&seller, &160, &50));
    assert!(client.can_create_invoice(&seller, &180, &50));
}
