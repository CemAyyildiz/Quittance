mod common;

use common::setup;
use dispute_resolution_outcome::Outcome;
use soroban_sdk::symbol_short;

#[test]
fn resolves_disputes_with_each_outcome_variant() {
    let (_, client) = setup();
    let d1 = symbol_short!("DSP1");
    let d2 = symbol_short!("DSP2");
    let d3 = symbol_short!("DSP3");

    client.resolve(&d1, &Outcome::FavorPayer);
    client.resolve(&d2, &Outcome::FavorSeller);
    client.resolve(&d3, &Outcome::Split);

    assert_eq!(client.outcome_of(&d1), Some(Outcome::FavorPayer));
    assert_eq!(client.outcome_of(&d2), Some(Outcome::FavorSeller));
    assert_eq!(client.outcome_of(&d3), Some(Outcome::Split));
}
