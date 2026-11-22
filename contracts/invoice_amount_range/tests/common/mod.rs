//! Shared test helpers for `invoice-amount-range`.

use invoice_amount_range::{InvoiceAmountRange, InvoiceAmountRangeClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
pub fn setup() -> (Env, InvoiceAmountRangeClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceAmountRange, ());
    let client = InvoiceAmountRangeClient::new(&env, &contract_id);
    (env, client)
}
