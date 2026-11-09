//! Test suite for `multi-sig-approval-counter`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{MultiSigApprovalCounter, MultiSigApprovalCounterClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, MultiSigApprovalCounterClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn setup_unauthed() -> (Env, MultiSigApprovalCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(MultiSigApprovalCounter, ());
    let client = MultiSigApprovalCounterClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn new_signer(env: &Env) -> Address {
    Address::generate(env)
}
