//! Error and invalid-input tests for `payment-amount-tolerance`.

use super::setup;
use crate::ToleranceError;

#[test]
fn non_positive_expected_or_negative_received_or_negative_tolerance_is_rejected() {
    let (_env, client) = setup();

    assert!(!client.is_within_tolerance(&0, &0, &10));
    assert!(!client.is_within_tolerance(&-100, &100, &10));
    assert!(!client.is_within_tolerance(&100, &-1, &10));
    assert!(!client.is_within_tolerance(&100, &100, &-1));

    assert_eq!(
        client.try_verify_within_tolerance(&0, &0, &10),
        Err(Ok(ToleranceError::InvalidExpectedAmount))
    );
    assert_eq!(
        client.try_verify_within_tolerance(&100, &-5, &10),
        Err(Ok(ToleranceError::NegativeReceivedAmount))
    );
    assert_eq!(
        client.try_verify_within_tolerance(&100, &100, &-5),
        Err(Ok(ToleranceError::NegativeTolerance))
    );
    assert_eq!(
        client.try_verify_within_tolerance(&100, &80, &10),
        Err(Ok(ToleranceError::OutsideTolerance))
    );
    assert!(!ToleranceError::InvalidExpectedAmount.message().is_empty());
    assert!(!ToleranceError::NegativeReceivedAmount.message().is_empty());
    assert!(!ToleranceError::NegativeTolerance.message().is_empty());
    assert!(!ToleranceError::OutsideTolerance.message().is_empty());
}
