mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn blocks_seller_during_cooldown_and_auto_unlocks_after() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    assert!(client.can_create_invoice(&seller, &100, &50));
    client.flag_dispute(&seller, &100);

    assert!(!client.can_create_invoice(&seller, &120, &50));
    assert_eq!(client.remaining_cooldown(&seller, &120, &50), 30);

    assert!(client.can_create_invoice(&seller, &150, &50));
    assert_eq!(client.remaining_cooldown(&seller, &150, &50), 0);
}
