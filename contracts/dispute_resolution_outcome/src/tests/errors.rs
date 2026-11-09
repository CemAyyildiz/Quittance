//! Write-once immutability and error tests for `dispute-resolution-outcome`.

use super::setup;
use crate::{Error, Outcome};
use soroban_sdk::symbol_short;

#[test]
fn second_resolve_with_same_or_different_outcome_is_rejected() {
    let (_env, client) = setup();
    let d = symbol_short!("DSP_IMM");

    client.resolve(&d, &Outcome::FavorPayer);

    assert_eq!(
        client.try_resolve(&d, &Outcome::FavorPayer),
        Err(Ok(Error::AlreadyResolved))
    );
    assert_eq!(
        client.try_resolve(&d, &Outcome::FavorSeller),
        Err(Ok(Error::AlreadyResolved))
    );
    assert_eq!(
        client.try_resolve(&d, &Outcome::Split),
        Err(Ok(Error::AlreadyResolved))
    );

    assert_eq!(client.outcome_of(&d), Some(Outcome::FavorPayer));
    assert!(!Error::AlreadyResolved.message().is_empty());
}
