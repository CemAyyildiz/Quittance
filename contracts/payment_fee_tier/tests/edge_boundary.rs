mod common;

use common::{sample_tiers, setup};

#[test]
fn exact_threshold_boundaries_upgrade_to_lower_fee() {
    let (env, client) = setup();
    let tiers = sample_tiers(&env);

    assert_eq!(client.fee_bps_for_volume(&0, &tiers), 250);
    assert_eq!(client.fee_bps_for_volume(&9_999, &tiers), 250);
    assert_eq!(client.fee_bps_for_volume(&10_000, &tiers), 175);
    assert_eq!(client.fee_bps_for_volume(&99_999, &tiers), 175);
    assert_eq!(client.fee_bps_for_volume(&100_000, &tiers), 100);
}
