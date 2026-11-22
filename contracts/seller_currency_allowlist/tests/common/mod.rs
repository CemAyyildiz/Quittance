//! Shared test setup for `seller-currency-allowlist`.

use seller_currency_allowlist::{SellerCurrencyAllowlist, SellerCurrencyAllowlistClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

/// Register the contract with all authorizations mocked and return the
/// environment plus a typed client.
///
/// The auth-failure test builds its own environment without mocking, so it
/// can prove that `allow_currency` really requires the seller's signature.
pub fn setup() -> (Env, SellerCurrencyAllowlistClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerCurrencyAllowlist, ());
    let client = SellerCurrencyAllowlistClient::new(&env, &contract_id);
    (env, client)
}

/// Generate a fresh seller address for the given environment.
pub fn seller(env: &Env) -> Address {
    Address::generate(env)
}
