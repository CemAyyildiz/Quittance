//! Shared test setup for `settlement-batch-id`.

use settlement_batch_id::{SettlementBatchId, SettlementBatchIdClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
pub fn setup() -> (Env, SettlementBatchIdClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SettlementBatchId, ());
    let client = SettlementBatchIdClient::new(&env, &contract_id);
    (env, client)
}
