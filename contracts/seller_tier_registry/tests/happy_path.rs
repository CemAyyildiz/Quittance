mod common;

use common::setup;
use seller_tier_registry::Tier;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn sets_and_reads_seller_tiers() {
    let (env, client, admin) = setup();
    assert_eq!(client.admin(), admin);

    let seller_a = Address::generate(&env);
    let seller_b = Address::generate(&env);
    let seller_c = Address::generate(&env);

    client.set_tier(&seller_a, &Tier::Bronze);
    client.set_tier(&seller_b, &Tier::Silver);
    client.set_tier(&seller_c, &Tier::Gold);

    assert_eq!(client.tier_of(&seller_a), Tier::Bronze);
    assert_eq!(client.tier_of(&seller_b), Tier::Silver);
    assert_eq!(client.tier_of(&seller_c), Tier::Gold);
}
