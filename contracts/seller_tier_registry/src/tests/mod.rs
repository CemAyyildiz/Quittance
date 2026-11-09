mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{SellerTierRegistry, SellerTierRegistryClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, SellerTierRegistryClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SellerTierRegistry, ());
    let client = SellerTierRegistryClient::new(&env, &contract_id);
    (env, client)
}
