use super::setup;

#[test]
fn quoted_rate_inside_100_bps_band_returns_true() {
    let (_env, client) = setup();
    let ref_rate = 10_000_000i128;
    assert!(client.is_within_band(&10_050_000, &ref_rate, &100));
    assert!(client.is_within_band(&9_950_000, &ref_rate, &100));
}
