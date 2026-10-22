//! Shared test setup for `seller-invoice-rate-summary`.

use seller_invoice_rate_summary::{SellerInvoiceRateSummary, SellerInvoiceRateSummaryClient};
use soroban_sdk::{Env, Vec};

/// Register the contract and return the environment plus a typed client.
///
/// The contract is read-only and performs no authorization checks, so no
/// auth mocking is needed.
pub fn setup() -> (Env, SellerInvoiceRateSummaryClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SellerInvoiceRateSummary, ());
    let client = SellerInvoiceRateSummaryClient::new(&env, &contract_id);
    (env, client)
}

/// Build a Soroban `Vec<u32>` of creation ledgers from a plain slice.
pub fn ledgers(env: &Env, entries: &[u32]) -> Vec<u32> {
    Vec::from_slice(env, entries)
}
