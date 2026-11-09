use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn second_mark_reminded_returns_false_and_keeps_flag_true() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_ONCE");

    assert!(client.mark_reminded(&inv));
    assert!(!client.mark_reminded(&inv));
    assert!(client.was_reminded(&inv));
}
