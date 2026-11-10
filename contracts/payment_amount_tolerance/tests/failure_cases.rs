mod common;

use common::setup;
use payment_amount_tolerance::AmountToleranceError;

#[test]
fn rejects_invalid_inputs_and_outside_tolerance_payments() {
    let (_, client) = setup();

    assert_eq!(
        client.try_evaluate(&0, &100, &5),
        Err(Ok(AmountToleranceError::InvalidExpectedAmount))
    );
    assert_eq!(
        client.try_evaluate(&100, &0, &5),
        Err(Ok(AmountToleranceError::InvalidReceivedAmount))
    );
    assert_eq!(
        client.try_evaluate(&100, &100, &-1),
        Err(Ok(AmountToleranceError::NegativeTolerance))
    );
    assert_eq!(
        client.try_evaluate(&100, &100, &100),
        Err(Ok(AmountToleranceError::ToleranceExceedsExpected))
    );
    assert_eq!(
        client.try_require_within_tolerance(&1_000, &950, &10),
        Err(Ok(AmountToleranceError::OutsideTolerance))
    );
}
