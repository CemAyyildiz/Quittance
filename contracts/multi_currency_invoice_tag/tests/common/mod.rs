//! Shared test setup for `multi-currency-invoice-tag`.

use multi_currency_invoice_tag::{MultiCurrencyInvoiceTag, MultiCurrencyInvoiceTagClient};
use soroban_sdk::Env;

/// Register the contract and return the environment plus a typed client.
///
/// The contract performs no authorization checks — any party may read or
/// write a tag in this standalone primitive — so no auth mocking is needed.
pub fn setup() -> (Env, MultiCurrencyInvoiceTagClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(MultiCurrencyInvoiceTag, ());
    let client = MultiCurrencyInvoiceTagClient::new(&env, &contract_id);
    (env, client)
}
