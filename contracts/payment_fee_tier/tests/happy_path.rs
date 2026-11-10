mod common;

use common::{sample_tiers, setup};

#[test]
fn selects_expected_fee_bps_across_volume_tiers() {
    let (env, client) = setup();
    let tiers = sample_tiers(&env);

    assert_eq!(client.fee_bps_for_volume(&500, &tiers), 250);
    assert_eq!(client.fee_bps_for_volume(&25_000, &tiers), 175);
    assert_eq!(client.fee_bps_for_volume(&250_000, &tiers), 100);
}
