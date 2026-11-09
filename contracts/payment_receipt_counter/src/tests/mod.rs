mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{PaymentReceiptCounter, PaymentReceiptCounterClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, PaymentReceiptCounterClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);
    (env, client)
}
