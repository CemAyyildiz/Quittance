mod common;

use common::setup;
use soroban_sdk::symbol_short;

#[test]
fn unresolved_dispute_returns_none_and_false() {
    let (_, client) = setup();
    let unknown = symbol_short!("NONE");

    assert!(!client.is_resolved(&unknown));
    assert_eq!(client.outcome_of(&unknown), None);
}
