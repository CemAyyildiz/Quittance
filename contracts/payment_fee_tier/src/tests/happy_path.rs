//! Happy-path tests for `payment-fee-tier`.

use super::{setup, standard_tiers};

#[test]
fn higher_cumulative_volume_unlocks_lower_fee_bps_tiers() {
    let (env, client) = setup();
    let tiers = standard_tiers(&env);

    assert_eq!(client.fee_bps_for_volume(&0, &tiers), 100);
    assert_eq!(client.fee_bps_for_volume(&5_000, &tiers), 100);
    assert_eq!(client.fee_bps_for_volume(&25_000, &tiers), 75);
    assert_eq!(client.fee_bps_for_volume(&100_000, &tiers), 50);
    assert_eq!(client.fee_bps_for_volume(&1_000_000, &tiers), 25);
}

#[test]
fn calculate_fee_amount_applies_resolved_tier_accurately() {
    let (env, client) = setup();
    let tiers = standard_tiers(&env);

    // At volume 60,000 -> 50 bps (0.50%). Payment of 20,000 -> fee = 100
    assert_eq!(client.calculate_fee_amount(&20_000, &60_000, &tiers), 100);
}
