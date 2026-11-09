//! Boundary tests for `payment-fee-tier`.

use super::{setup, standard_tiers};
use soroban_sdk::vec;

#[test]
fn exact_threshold_boundaries_switch_to_new_tier() {
    let (env, client) = setup();
    let tiers = standard_tiers(&env);

    assert_eq!(client.fee_bps_for_volume(&9_999, &tiers), 100);
    assert_eq!(client.fee_bps_for_volume(&10_000, &tiers), 75);
    assert_eq!(client.fee_bps_for_volume(&49_999, &tiers), 75);
    assert_eq!(client.fee_bps_for_volume(&50_000, &tiers), 50);
    assert_eq!(client.fee_bps_for_volume(&249_999, &tiers), 50);
    assert_eq!(client.fee_bps_for_volume(&250_000, &tiers), 25);
}

#[test]
fn empty_thresholds_and_volume_below_first_tier_are_handled_cleanly() {
    let (env, client) = setup();
    let empty = vec![&env];
    assert_eq!(client.fee_bps_for_volume(&10_000, &empty), 0);

    // First threshold starts at 1_000; volume 500 falls back to lowest tier (120 bps)
    let nonzero_start = vec![&env, (1_000_i128, 120_u32), (5_000_i128, 80_u32)];
    assert_eq!(client.fee_bps_for_volume(&500, &nonzero_start), 120);
}
