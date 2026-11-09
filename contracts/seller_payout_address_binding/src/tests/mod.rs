//! Test suite for `seller-payout-address-binding`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{SellerPayoutAddressBinding, SellerPayoutAddressBindingClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, SellerPayoutAddressBindingClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerPayoutAddressBinding, ());
    let client = SellerPayoutAddressBindingClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_addr(env: &Env) -> Address {
    Address::generate(env)
}
