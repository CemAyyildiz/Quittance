use super::setup;
use crate::MAX_DECIMALS;

#[test]
fn zero_and_max_decimals_boundaries_succeed() {
    let (_env, client) = setup();
    assert!(client.matches_expected_decimals(&0, &0));
    assert!(client.matches_expected_decimals(&MAX_DECIMALS, &MAX_DECIMALS));
    assert_eq!(client.decimal_delta(&0, &MAX_DECIMALS), MAX_DECIMALS);
}
