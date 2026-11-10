mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn blacklists_and_unblacklists_seller_addresses() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    assert!(client.is_allowed(&seller));
    client.blacklist(&seller);
    assert!(!client.is_allowed(&seller));
    assert_eq!(client.blacklisted_count(), 1);

    client.unblacklist(&seller);
    assert!(client.is_allowed(&seller));
    assert_eq!(client.blacklisted_count(), 0);
}
