use crate::{types::Tier, SellerTierRegistry, SellerTierRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_multiple_sellers_independent_tiers() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let seller_a = Address::generate(&env);
    let seller_b = Address::generate(&env);
    let seller_c = Address::generate(&env);

    client.set_tier(&seller_a, &Tier::Bronze);
    client.set_tier(&seller_b, &Tier::Silver);
    client.set_tier(&seller_c, &Tier::Gold);

    assert_eq!(client.tier_of(&seller_a), Some(Tier::Bronze));
    assert_eq!(client.tier_of(&seller_b), Some(Tier::Silver));
    assert_eq!(client.tier_of(&seller_c), Some(Tier::Gold));

    client.remove_tier(&seller_b);
    assert!(!client.has_tier(&seller_b));
    assert_eq!(client.tier_of(&seller_b), None);
    assert_eq!(client.tier_of(&seller_a), Some(Tier::Bronze));
    assert_eq!(client.tier_of(&seller_c), Some(Tier::Gold));
}
