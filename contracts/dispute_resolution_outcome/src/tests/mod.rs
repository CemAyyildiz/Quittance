//! Test suite for `dispute-resolution-outcome`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{DisputeResolutionOutcome, DisputeResolutionOutcomeClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, DisputeResolutionOutcomeClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(DisputeResolutionOutcome, ());
    let client = DisputeResolutionOutcomeClient::new(&env, &contract_id);
    (env, client)
}
