mod common;

use currency_decimals_registry::{CurrencyDecimalsRegistryClient, MAX_DECIMALS};
use soroban_sdk::symbol_short;

#[test]
fn zero_and_maximum_are_valid_values() {
    let (env, admin, contract_id) = common::setup();
    env.mock_all_auths();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let zero = symbol_short!("ZERO");
    let max = symbol_short!("MAX");

    client.set_decimals(&admin, &zero, &0);
    client.set_decimals(&admin, &max, &MAX_DECIMALS);
    assert_eq!(client.decimals_of(&zero), 0);
    assert_eq!(client.decimals_of(&max), MAX_DECIMALS);
}
