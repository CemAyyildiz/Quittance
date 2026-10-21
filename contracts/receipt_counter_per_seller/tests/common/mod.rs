//! Shared test setup for `receipt-counter-per-seller`.

use receipt_counter_per_seller::{ReceiptCounterPerSeller, ReceiptCounterPerSellerClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
pub fn setup() -> (Env, ReceiptCounterPerSellerClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(ReceiptCounterPerSeller, ());
    let client = ReceiptCounterPerSellerClient::new(&env, &contract_id);
    (env, client)
}
