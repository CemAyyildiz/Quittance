use crate::{types::{RegistryError, Tier}, SellerTierRegistry, SellerTierRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn test_uninitialized_calls_fail() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let res = client.try_set_tier(&seller, &Tier::Gold);
    assert_eq!(res.unwrap_err().unwrap(), RegistryError::NotInitialized);
}

#[test]
fn test_double_initialization_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let admin_2 = Address::generate(&env);
    let res = client.try_initialize(&admin_2);
    assert_eq!(res.unwrap_err().unwrap(), RegistryError::AlreadyInitialized);
}

#[test]
fn test_remove_nonexistent_tier_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    let seller = Address::generate(&env);
    let res = client.try_remove_tier(&seller);
    assert_eq!(res.unwrap_err().unwrap(), RegistryError::TierNotFound);
}
