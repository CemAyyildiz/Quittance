mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{PaymentMemoLengthGuard, PaymentMemoLengthGuardClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, PaymentMemoLengthGuardClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentMemoLengthGuard, ());
    let client = PaymentMemoLengthGuardClient::new(&env, &contract_id);
    (env, client)
}
