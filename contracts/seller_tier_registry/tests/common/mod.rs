use seller_tier_registry::{SellerTierRegistryContract, SellerTierRegistryContractClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub fn setup() -> (Env, SellerTierRegistryContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerTierRegistryContract, ());
    let client = SellerTierRegistryContractClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin);
    (env, client, admin)
}
