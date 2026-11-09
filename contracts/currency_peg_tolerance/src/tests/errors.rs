use super::setup;
use crate::Error;

#[test]
fn rejects_non_positive_rates_and_bps_over_10000() {
    let (_env, client) = setup();
    assert_eq!(
        client.try_validate_rate(&1_000, &0, &100),
        Err(Ok(Error::InvalidReferenceRate))
    );
    assert_eq!(
        client.try_validate_rate(&0, &1_000, &100),
        Err(Ok(Error::InvalidQuotedRate))
    );
    assert_eq!(
        client.try_validate_rate(&1_000, &1_000, &10_001),
        Err(Ok(Error::InvalidToleranceBps))
    );
}
