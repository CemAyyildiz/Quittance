mod common;

use common::setup;
use dispute_resolution_outcome::{payer_share_bps, Outcome};
use soroban_sdk::symbol_short;

#[test]
fn maps_outcomes_to_expected_payer_shares() {
    let (_, client) = setup();
    let dsp = symbol_short!("DSPSPL");

    client.resolve(&dsp, &Outcome::Split);
    let outcome = client.require_outcome(&dsp);
    assert_eq!(payer_share_bps(outcome), 5_000);
    assert_eq!(payer_share_bps(Outcome::FavorPayer), 10_000);
    assert_eq!(payer_share_bps(Outcome::FavorSeller), 0);
}
