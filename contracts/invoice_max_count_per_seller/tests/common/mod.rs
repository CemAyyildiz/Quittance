//! Shared test helpers for `invoice-max-count-per-seller`.

use invoice_max_count_per_seller::{InvoiceMaxCountPerSeller, InvoiceMaxCountPerSellerClient};
use soroban_sdk::Env;

/// Register the contract with `cap` and return the environment and a typed client.
pub fn setup(cap: u32) -> (Env, InvoiceMaxCountPerSellerClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceMaxCountPerSeller, (cap,));
    let client = InvoiceMaxCountPerSellerClient::new(&env, &contract_id);
    (env, client)
}
