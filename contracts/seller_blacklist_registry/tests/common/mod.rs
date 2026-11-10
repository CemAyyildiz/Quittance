use seller_blacklist_registry::{
    SellerBlacklistRegistryContract, SellerBlacklistRegistryContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, SellerBlacklistRegistryContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerBlacklistRegistryContract, ());
    let client = SellerBlacklistRegistryContractClient::new(&env, &contract_id);
    (env, client)
}
