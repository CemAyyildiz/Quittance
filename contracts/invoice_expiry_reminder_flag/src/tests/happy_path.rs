use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn first_mark_reminded_returns_true_and_sets_flag() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_100");

    assert!(!client.was_reminded(&inv));
    assert!(client.mark_reminded(&inv));
    assert!(client.was_reminded(&inv));
}
