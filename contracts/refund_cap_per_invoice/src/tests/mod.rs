mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{RefundCapPerInvoice, RefundCapPerInvoiceClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, RefundCapPerInvoiceClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(RefundCapPerInvoice, ());
    let client = RefundCapPerInvoiceClient::new(&env, &contract_id);
    (env, client)
}
