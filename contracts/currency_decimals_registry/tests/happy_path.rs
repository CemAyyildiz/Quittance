mod common;

use currency_decimals_registry::CurrencyDecimalsRegistryClient;
use soroban_sdk::symbol_short;

#[test]
fn administrator_sets_and_updates_independent_codes() {
    let (env, admin, contract_id) = common::setup();
    env.mock_all_auths();
    let client = CurrencyDecimalsRegistryClient::new(&env, &contract_id);
    let xlm = symbol_short!("XLM");
    let usdc = symbol_short!("USDC");

    client.set_decimals(&admin, &xlm, &7);
    client.set_decimals(&admin, &usdc, &6);
    assert_eq!(client.decimals_of(&xlm), 7);
    assert_eq!(client.decimals_of(&usdc), 6);

    client.set_decimals(&admin, &xlm, &8);
    assert_eq!(client.decimals_of(&xlm), 8);
    assert_eq!(client.decimals_of(&usdc), 6);
}
