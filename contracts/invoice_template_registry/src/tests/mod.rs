//! Test suite for `invoice-template-registry`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceTemplateRegistry, InvoiceTemplateRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, InvoiceTemplateRegistryClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_seller(env: &Env) -> Address {
    Address::generate(env)
}
