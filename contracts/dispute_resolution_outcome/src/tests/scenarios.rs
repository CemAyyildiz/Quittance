//! Multi-dispute isolation scenarios for `dispute-resolution-outcome`.

use super::setup;
use crate::{Error, Outcome};
use soroban_sdk::symbol_short;

#[test]
fn resolving_one_dispute_never_affects_other_disputes() {
    let (_env, client) = setup();
    let d_a = symbol_short!("DSP_A");
    let d_b = symbol_short!("DSP_B");

    client.resolve(&d_a, &Outcome::Split);
    assert_eq!(
        client.try_resolve(&d_a, &Outcome::FavorSeller),
        Err(Ok(Error::AlreadyResolved))
    );

    // d_b is still unresolved and can be resolved independently
    assert!(!client.is_resolved(&d_b));
    client.resolve(&d_b, &Outcome::FavorSeller);
    assert_eq!(client.outcome_of(&d_a), Some(Outcome::Split));
    assert_eq!(client.outcome_of(&d_b), Some(Outcome::FavorSeller));
}
