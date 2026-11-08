mod common;

use common::setup;
use seller_tier_registry::Tier;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn unassigned_seller_defaults_to_bronze() {
    let (env, client, _) = setup();
    let unassigned = Address::generate(&env);

    assert!(!client.has_explicit_tier(&unassigned));
    assert_eq!(client.tier_of(&unassigned), Tier::Bronze);
}

#[test]
fn overwriting_and_removing_tier_restores_default() {
    let (env, client, _) = setup();
    let seller = Address::generate(&env);

    client.set_tier(&seller, &Tier::Gold);
    assert!(client.has_explicit_tier(&seller));
    assert_eq!(client.tier_of(&seller), Tier::Gold);

    client.set_tier(&seller, &Tier::Silver);
    assert_eq!(client.tier_of(&seller), Tier::Silver);

    client.remove_tier(&seller);
    assert!(!client.has_explicit_tier(&seller));
    assert_eq!(client.tier_of(&seller), Tier::Bronze);
}
