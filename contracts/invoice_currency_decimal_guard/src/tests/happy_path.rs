use super::setup;
use crate::STELLAR_DEFAULT_DECIMALS;

#[test]
fn matching_decimals_returns_true() {
    let (_env, client) = setup();
    assert!(client.matches_expected_decimals(&STELLAR_DEFAULT_DECIMALS, &7));
    assert!(client.matches_expected_decimals(&6, &6));
    assert_eq!(client.validate_decimals(&7, &7), 7);
}
