mod common;

use common::setup;
use soroban_sdk::symbol_short;

#[test]
fn marks_invoice_as_reminded_once() {
    let (_, client) = setup();
    let inv = symbol_short!("INV101");

    assert!(!client.was_reminded(&inv));
    assert!(client.mark_reminded(&inv));
    assert!(client.was_reminded(&inv));
    assert_eq!(client.total_reminded_count(), 1);
}
