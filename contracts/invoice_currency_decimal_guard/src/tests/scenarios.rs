use super::setup;

#[test]
fn detects_usdc_6_vs_stellar_sac_7_decimals_mismatch() {
    let (_env, client) = setup();
    assert!(!client.matches_expected_decimals(&6, &7));
    assert_eq!(client.decimal_delta(&6, &7), 1);
}
