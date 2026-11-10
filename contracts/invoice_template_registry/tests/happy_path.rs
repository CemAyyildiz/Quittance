mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn registers_and_retrieves_seller_template() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let tid = symbol_short!("MONTHLY");
    let memo = symbol_short!("SUB_PRO");

    let created = client.register_template(&seller, &tid, &50_000_000, &memo);
    assert_eq!(created.amount, 50_000_000);
    assert_eq!(created.memo, memo);

    let fetched = client.template_for(&seller, &tid).unwrap();
    assert_eq!(fetched, created);
}
