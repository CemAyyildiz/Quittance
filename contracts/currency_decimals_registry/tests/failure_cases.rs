mod common;

use currency_decimals_registry::{CurrencyDecimalsRegistryClient, RegistryError, MAX_DECIMALS};
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn different_address_cannot_replace_the_administrator() {
    let (env, admin, contract_id) = common::setup();
    env.mock_all_auths();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let other = Address::generate(&env);
    let code = symbol_short!("XLM");

    assert_eq!(
        client.try_set_decimals(&other, &code, &6),
        Err(Ok(RegistryError::NotAdmin))
    );
    assert_eq!(client.decimals_of(&code), 7);
    client.set_decimals(&admin, &code, &8);
    assert_eq!(client.decimals_of(&code), 8);
}

#[test]
fn rejects_values_above_maximum_without_changing_state() {
    let (env, admin, contract_id) = common::setup();
    env.mock_all_auths();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let code = symbol_short!("USDC");
    client.set_decimals(&admin, &code, &6);

    assert_eq!(
        client.try_set_decimals(&admin, &code, &(MAX_DECIMALS + 1)),
        Err(Ok(RegistryError::InvalidDecimals))
    );
    assert_eq!(client.decimals_of(&code), 6);
}

#[test]
fn matching_address_still_needs_authorization() {
    let (env, admin, contract_id) = common::setup();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let code = symbol_short!("XLM");

    assert!(client.try_set_decimals(&admin, &code, &8).is_err());
    assert_eq!(client.decimals_of(&code), 7);
}
