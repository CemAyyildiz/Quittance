use crate::{types::Tier, SellerTierRegistry, SellerTierRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_happy_path_tier_assignment() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);

    client.initialize(&admin);
    assert_eq!(client.get_admin(), admin);

    assert!(!client.has_tier(&seller));
    assert_eq!(client.tier_of(&seller), None);

    client.set_tier(&seller, &Tier::Bronze);
    assert!(client.has_tier(&seller));
    assert_eq!(client.tier_of(&seller), Some(Tier::Bronze));

    client.set_tier(&seller, &Tier::Silver);
    assert_eq!(client.tier_of(&seller), Some(Tier::Silver));

    client.set_tier(&seller, &Tier::Gold);
    assert_eq!(client.tier_of(&seller), Some(Tier::Gold));
}
