mod common;

use common::setup;
use currency_peg_tolerance::PegToleranceError;

#[test]
fn rejects_non_positive_rates_and_excessive_tolerance() {
    let (_, client) = setup();

    assert!(!client.is_within_band(&0, &10_000, &100));
    assert!(!client.is_within_band(&10_000, &0, &100));
    assert!(!client.is_within_band(&10_000, &10_000, &10_001));

    assert_eq!(
        client.try_evaluate_band(&0, &10_000, &100),
        Err(Ok(PegToleranceError::InvalidQuotedRate))
    );
    assert_eq!(
        client.try_evaluate_band(&10_000, &-5, &100),
        Err(Ok(PegToleranceError::InvalidReferenceRate))
    );
    assert_eq!(
        client.try_evaluate_band(&10_000, &10_000, &15_000),
        Err(Ok(PegToleranceError::ToleranceTooHigh))
    );
}

#[test]
fn require_within_band_returns_out_of_band_error() {
    let (_, client) = setup();
    assert_eq!(
        client.try_require_within_band(&9_000_000, &10_000_000, &100),
        Err(Ok(PegToleranceError::OutOfBand))
    );
}
