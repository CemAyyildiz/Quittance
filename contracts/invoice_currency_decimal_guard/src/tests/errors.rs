use super::setup;
use crate::{Error, MAX_DECIMALS};

#[test]
fn mismatch_and_out_of_range_decimals_are_rejected() {
    let (_env, client) = setup();
    assert!(!client.matches_expected_decimals(&6, &7));
    assert_eq!(
        client.try_validate_decimals(&6, &7),
        Err(Ok(Error::DecimalsMismatch))
    );
    assert!(!client.matches_expected_decimals(&(MAX_DECIMALS + 1), &(MAX_DECIMALS + 1)));
    assert_eq!(
        client.try_validate_decimals(&19, &19),
        Err(Ok(Error::DecimalsOutOfRange))
    );
}
