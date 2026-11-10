mod common;

use common::{sample_tiers, setup};
use payment_fee_tier::FeeTierError;
use soroban_sdk::vec;

#[test]
fn rejects_negative_volume_unsorted_or_empty_thresholds() {
    let (env, client) = setup();
    let tiers = sample_tiers(&env);

    assert_eq!(
        client.try_fee_bps_for_volume(&-1, &tiers),
        Err(Ok(FeeTierError::NegativeVolume))
    );
    let empty = vec![&env];
    assert_eq!(
        client.try_fee_bps_for_volume(&100, &empty),
        Err(Ok(FeeTierError::EmptyThresholds))
    );
    let unsorted = vec![&env, (10_000, 200), (5_000, 100)];
    assert_eq!(
        client.try_fee_bps_for_volume(&15_000, &unsorted),
        Err(Ok(FeeTierError::UnsortedThresholds))
    );
}
