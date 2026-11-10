mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn binds_and_rebinds_seller_payout_address_after_cooldown() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    assert_eq!(client.payout_address_of(&seller), None);
    client.bind(&seller, &p1, &1_000);
    assert_eq!(client.payout_address_of(&seller), Some(p1));

    // Default cooldown is 100 ledgers -> rebind at 1_100 succeeds
    client.bind(&seller, &p2, &1_100);
    assert_eq!(client.payout_address_of(&seller), Some(p2));
}
