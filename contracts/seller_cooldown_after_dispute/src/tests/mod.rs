//! Test suite for `seller-cooldown-after-dispute`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{SellerCooldownAfterDispute, SellerCooldownAfterDisputeClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, SellerCooldownAfterDisputeClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SellerCooldownAfterDispute, ());
    let client = SellerCooldownAfterDisputeClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_seller(env: &Env) -> Address {
    Address::generate(env)
}
