mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn seller_voids_unpaid_invoice_once() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let inv = symbol_short!("INV1");

    assert!(!client.is_void(&inv));
    let rec = client.void_invoice(&seller, &inv);
    assert_eq!(rec.invoice_id, inv);
    assert_eq!(rec.seller, seller);
    assert!(client.is_void(&inv));
}
