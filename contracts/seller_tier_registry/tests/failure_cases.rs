mod common;

use common::setup;
use seller_tier_registry::{SellerTierError, SellerTierRegistryContract, SellerTierRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn double_initialize_returns_error() {
    let (_, client, admin) = setup();
    let res = client.try_initialize(&admin);
    assert_eq!(res, Err(Ok(SellerTierError::AlreadyInitialized)));
}

#[test]
fn remove_unregistered_seller_returns_error() {
    let (env, client, _) = setup();
    let unknown = Address::generate(&env);
    let res = client.try_remove_tier(&unknown);
    assert_eq!(res, Err(Ok(SellerTierError::SellerNotRegistered)));
}

#[test]
fn admin_before_initialize_returns_not_initialized() {
    let env = Env::default();
    let contract_id = env.register(SellerTierRegistryContract, ());
    let client = SellerTierRegistryContractClient::new(&env, &contract_id);
    assert_eq!(client.try_admin(), Err(Ok(SellerTierError::NotInitialized)));
}
