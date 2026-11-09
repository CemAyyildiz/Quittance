use super::setup;
use crate::Tier;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn assigns_and_retrieves_seller_tiers() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    assert_eq!(client.tier_of(&seller), Tier::Bronze);
    client.set_tier(&seller, &Tier::Gold);
    assert_eq!(client.tier_of(&seller), Tier::Gold);
    assert!(client.has_assigned_tier(&seller));
}
