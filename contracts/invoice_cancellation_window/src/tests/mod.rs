//! Test suite for `invoice-cancellation-window`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceCancellationWindow, InvoiceCancellationWindowClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, InvoiceCancellationWindowClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceCancellationWindow, ());
    let client = InvoiceCancellationWindowClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_payer(env: &Env) -> Address {
    Address::generate(env)
}
