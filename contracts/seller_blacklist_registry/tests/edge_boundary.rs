mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn repeated_blacklist_and_unblacklist_are_idempotent() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    client.blacklist(&seller);
    client.blacklist(&seller);
    assert_eq!(client.blacklisted_count(), 1);

    client.unblacklist(&seller);
    client.unblacklist(&seller);
    assert_eq!(client.blacklisted_count(), 0);
}
