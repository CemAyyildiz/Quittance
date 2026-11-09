//! Test suite for `invoice-void-flag`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceVoidFlag, InvoiceVoidFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, InvoiceVoidFlagClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceVoidFlag, ());
    let client = InvoiceVoidFlagClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_seller(env: &Env) -> Address {
    Address::generate(env)
}
