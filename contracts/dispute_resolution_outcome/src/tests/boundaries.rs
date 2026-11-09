//! Boundary tests for `dispute-resolution-outcome`.

use super::setup;
use crate::Outcome;
use soroban_sdk::{symbol_short, Symbol};

#[test]
fn single_char_and_max_length_symbols_resolve_cleanly() {
    let (env, client) = setup();
    let short_id = symbol_short!("A");
    let long_id = Symbol::new(&env, "DISPUTE_LONG_IDENTIFIER_2026");

    client.resolve(&short_id, &Outcome::Split);
    client.resolve(&long_id, &Outcome::FavorSeller);

    assert_eq!(client.outcome_of(&short_id), Some(Outcome::Split));
    assert_eq!(client.outcome_of(&long_id), Some(Outcome::FavorSeller));
}
