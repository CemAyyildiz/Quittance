mod common;

use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn multiple_invoices_from_same_seller_transition_independently() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);
    let inv1 = symbol_short!("INV1");
    let inv2 = symbol_short!("INV2");
    client.publish(&seller, &inv1);
    assert!(!client.is_draft(&inv1));
    assert!(client.is_draft(&inv2));
}
