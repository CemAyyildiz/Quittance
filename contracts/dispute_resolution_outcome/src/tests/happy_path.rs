//! Happy-path tests for `dispute-resolution-outcome`.

use super::setup;
use crate::{payout_shares_bps, Outcome};
use soroban_sdk::symbol_short;

#[test]
fn resolve_each_outcome_variant_and_read_back() {
    let (_env, client) = setup();
    let d1 = symbol_short!("DSP_1");
    let d2 = symbol_short!("DSP_2");
    let d3 = symbol_short!("DSP_3");

    assert!(!client.is_resolved(&d1));
    assert_eq!(client.outcome_of(&d1), None);

    client.resolve(&d1, &Outcome::FavorPayer);
    client.resolve(&d2, &Outcome::FavorSeller);
    client.resolve(&d3, &Outcome::Split);

    assert!(client.is_resolved(&d1));
    assert_eq!(client.outcome_of(&d1), Some(Outcome::FavorPayer));
    assert_eq!(client.outcome_of(&d2), Some(Outcome::FavorSeller));
    assert_eq!(client.outcome_of(&d3), Some(Outcome::Split));

    assert_eq!(payout_shares_bps(Outcome::FavorPayer), (10_000, 0));
    assert_eq!(payout_shares_bps(Outcome::FavorSeller), (0, 10_000));
    assert_eq!(payout_shares_bps(Outcome::Split), (5_000, 5_000));
}
