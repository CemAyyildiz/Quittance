mod common;

use currency_decimals_registry::{CurrencyDecimalsRegistryClient, DEFAULT_DECIMALS};
use soroban_sdk::symbol_short;

#[test]
fn unknown_codes_use_default_and_codes_are_case_sensitive() {
    let (env, admin, contract_id) = common::setup();
    env.mock_all_auths();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let upper = symbol_short!("USDC");
    let lower = symbol_short!("usdc");

    assert_eq!(client.decimals_of(&upper), DEFAULT_DECIMALS);
    assert_eq!(client.decimals_of(&lower), DEFAULT_DECIMALS);
    client.set_decimals(&admin, &upper, &6);
    assert_eq!(client.decimals_of(&upper), 6);
    assert_eq!(client.decimals_of(&lower), DEFAULT_DECIMALS);
}
