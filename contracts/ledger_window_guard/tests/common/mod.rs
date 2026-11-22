//! Shared test setup for `ledger-window-guard`.

use ledger_window_guard::{LedgerWindowGuard, LedgerWindowGuardClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
///
/// The contract is read-only and performs no authorization checks, so no
/// auth mocking is needed.
pub fn setup() -> (Env, LedgerWindowGuardClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(LedgerWindowGuard, ());
    let client = LedgerWindowGuardClient::new(&env, &contract_id);
    (env, client)
}
