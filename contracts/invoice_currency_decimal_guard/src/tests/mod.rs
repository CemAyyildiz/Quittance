mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceCurrencyDecimalGuard, InvoiceCurrencyDecimalGuardClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, InvoiceCurrencyDecimalGuardClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(InvoiceCurrencyDecimalGuard, ());
    let client = InvoiceCurrencyDecimalGuardClient::new(&env, &contract_id);
    (env, client)
}
