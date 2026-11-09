//! Test suite for `payment-amount-tolerance`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{PaymentAmountTolerance, PaymentAmountToleranceClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, PaymentAmountToleranceClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentAmountTolerance, ());
    let client = PaymentAmountToleranceClient::new(&env, &contract_id);
    (env, client)
}
