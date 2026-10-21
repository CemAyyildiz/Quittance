//! Shared test setup for `invoice-currency-lock`.

use invoice_currency_lock::{InvoiceCurrencyLock, InvoiceCurrencyLockClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
pub fn setup() -> (Env, InvoiceCurrencyLockClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceCurrencyLock, ());
    let client = InvoiceCurrencyLockClient::new(&env, &contract_id);
    (env, client)
}
