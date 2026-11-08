mod common;

use common::setup;
use soroban_sdk::symbol_short;

#[test]
fn repeated_mark_reminded_is_idempotent_and_one_way() {
    let (_, client) = setup();
    let inv = symbol_short!("INV202");

    assert!(client.mark_reminded(&inv));
    assert!(!client.mark_reminded(&inv));
    assert!(!client.mark_reminded(&inv));
    assert!(client.was_reminded(&inv));
    assert_eq!(client.total_reminded_count(), 1);
}
