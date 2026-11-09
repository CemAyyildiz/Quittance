//! Test suite for `seller-blacklist-registry`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{SellerBlacklistRegistry, SellerBlacklistRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, SellerBlacklistRegistryClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerBlacklistRegistry, ());
    let client = SellerBlacklistRegistryClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_addr(env: &Env) -> Address {
    Address::generate(env)
}
