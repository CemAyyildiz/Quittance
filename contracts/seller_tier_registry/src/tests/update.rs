use crate::{types::Tier, SellerTierRegistry, SellerTierRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_tier_promotion_and_demotion_cycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let seller = Address::generate(&env);

    // Initial assignment: Bronze
    client.set_tier(&seller, &Tier::Bronze);
    assert_eq!(client.tier_of(&seller), Some(Tier::Bronze));

    // Promotion to Silver
    client.set_tier(&seller, &Tier::Silver);
    assert_eq!(client.tier_of(&seller), Some(Tier::Silver));

    // Promotion to Gold
    client.set_tier(&seller, &Tier::Gold);
    assert_eq!(client.tier_of(&seller), Some(Tier::Gold));

    // Demotion back to Bronze
    client.set_tier(&seller, &Tier::Bronze);
    assert_eq!(client.tier_of(&seller), Some(Tier::Bronze));
}
