mod common;

use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn invoice_starts_as_draft_and_transitions_to_published() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);
    let inv = symbol_short!("INV1");
    assert!(client.is_draft(&inv));
    assert!(!client.is_published(&inv));
    assert_eq!(client.published_by(&inv), None);

    client.publish(&seller, &inv);

    assert!(!client.is_draft(&inv));
    assert!(client.is_published(&inv));
    assert_eq!(client.published_by(&inv), Some(seller));
}
