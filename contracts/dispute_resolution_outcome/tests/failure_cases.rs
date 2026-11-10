mod common;

use common::setup;
use dispute_resolution_outcome::{DisputeOutcomeError, Outcome};
use soroban_sdk::symbol_short;

#[test]
fn rejects_second_resolution_attempt_and_missing_require() {
    let (_, client) = setup();
    let dsp = symbol_short!("DSP9");

    assert_eq!(
        client.try_require_outcome(&dsp),
        Err(Ok(DisputeOutcomeError::NotResolved))
    );

    client.resolve(&dsp, &Outcome::FavorPayer);
    assert_eq!(
        client.try_resolve(&dsp, &Outcome::FavorSeller),
        Err(Ok(DisputeOutcomeError::AlreadyResolved))
    );
    assert_eq!(client.outcome_of(&dsp), Some(Outcome::FavorPayer));
}
