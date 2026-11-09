mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{CurrencyPegTolerance, CurrencyPegToleranceClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, CurrencyPegToleranceClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(CurrencyPegTolerance, ());
    let client = CurrencyPegToleranceClient::new(&env, &contract_id);
    (env, client)
}
