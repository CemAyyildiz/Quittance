mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn supports_multiple_templates_for_same_seller() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    client.register_template(&seller, &symbol_short!("BASIC"), &1_000, &symbol_short!("B"));
    client.register_template(&seller, &symbol_short!("PRO"), &5_000, &symbol_short!("P"));

    assert_eq!(
        client.template_for(&seller, &symbol_short!("BASIC")).unwrap().amount,
        1_000
    );
    assert_eq!(
        client.template_for(&seller, &symbol_short!("PRO")).unwrap().amount,
        5_000
    );
}
