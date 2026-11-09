//! Error and invalid-input tests for `payment-fee-tier`.

use super::{setup, standard_tiers};
use crate::FeeTierError;
use soroban_sdk::vec;

#[test]
fn checked_lookup_rejects_empty_unsorted_or_out_of_range_thresholds() {
    let (env, client) = setup();
    let empty = vec![&env];
    assert_eq!(
        client.try_fee_bps_for_volume_checked(&100, &empty),
        Err(Ok(FeeTierError::EmptyThresholds))
    );

    let unsorted = vec![&env, (10_000_i128, 100_u32), (5_000_i128, 50_u32)];
    assert_eq!(
        client.try_fee_bps_for_volume_checked(&100, &unsorted),
        Err(Ok(FeeTierError::InvalidThresholdOrder))
    );

    let excessive_bps = vec![&env, (0_i128, 10_001_u32)];
    assert_eq!(
        client.try_fee_bps_for_volume_checked(&100, &excessive_bps),
        Err(Ok(FeeTierError::InvalidFeeBps))
    );
}

#[test]
fn negative_volumes_and_overflow_in_fee_calculation_are_rejected() {
    let (env, client) = setup();
    let tiers = standard_tiers(&env);

    assert_eq!(
        client.try_fee_bps_for_volume_checked(&-1, &tiers),
        Err(Ok(FeeTierError::NegativeAmount))
    );
    assert_eq!(
        client.try_calculate_fee_amount(&-100, &0, &tiers),
        Err(Ok(FeeTierError::NegativeAmount))
    );
    assert_eq!(
        client.try_calculate_fee_amount(&i128::MAX, &0, &tiers),
        Err(Ok(FeeTierError::MathOverflow))
    );
    assert!(!FeeTierError::EmptyThresholds.message().is_empty());
    assert!(!FeeTierError::NegativeAmount.message().is_empty());
    assert!(!FeeTierError::InvalidThresholdOrder.message().is_empty());
    assert!(!FeeTierError::InvalidFeeBps.message().is_empty());
    assert!(!FeeTierError::MathOverflow.message().is_empty());
}
