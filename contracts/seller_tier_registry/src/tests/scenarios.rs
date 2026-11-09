use super::setup;
use crate::Tier;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn clearing_tier_restores_bronze_default_without_affecting_other_sellers() {
    let (env, client) = setup();
    let s1 = Address::generate(&env);
    let s2 = Address::generate(&env);

    client.set_tier(&s1, &Tier::Silver);
    client.set_tier(&s2, &Tier::Gold);

    client.clear_tier(&s1);
    assert!(!client.has_assigned_tier(&s1));
    assert_eq!(client.tier_of(&s1), Tier::Bronze);
    assert_eq!(client.tier_of(&s2), Tier::Gold);
}
