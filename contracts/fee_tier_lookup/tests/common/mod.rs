//! Shared test setup for `fee-tier-lookup`.

use fee_tier_lookup::{FeeTierLookup, FeeTierLookupClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

/// Register the contract, construct it with a fresh admin, and return the
/// environment, the admin address, and a typed client.
pub fn setup() -> (Env, Address, FeeTierLookupClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(FeeTierLookup, (&admin,));
    let client = FeeTierLookupClient::new(&env, &contract_id);
    (env, admin, client)
}
