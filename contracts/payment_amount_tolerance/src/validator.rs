use crate::types::{AmountToleranceError, AmountToleranceEvaluation};

pub fn evaluate_amount_tolerance(
    expected: i128,
    received: i128,
    tolerance: i128,
) -> Result<AmountToleranceEvaluation, AmountToleranceError> {
    if expected <= 0 {
        return Err(AmountToleranceError::InvalidExpectedAmount);
    }
    if received <= 0 {
        return Err(AmountToleranceError::InvalidReceivedAmount);
    }
    if tolerance < 0 {
        return Err(AmountToleranceError::NegativeTolerance);
    }
    if tolerance >= expected {
        return Err(AmountToleranceError::ToleranceExceedsExpected);
    }

    let abs_difference = if expected >= received {
        expected - received
    } else {
        received - expected
    };
    let within_tolerance = abs_difference <= tolerance;

    Ok(AmountToleranceEvaluation {
        expected,
        received,
        tolerance,
        abs_difference,
        within_tolerance,
    })
}
