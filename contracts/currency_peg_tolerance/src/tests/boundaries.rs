use super::setup;

#[test]
fn exact_lower_and_upper_band_edges_succeed_and_one_unit_past_fails() {
    let (_env, client) = setup();
    let ref_rate = 10_000i128;
    assert_eq!(client.band_bounds(&ref_rate, &50), (9_950, 10_050));
    assert!(client.is_within_band(&9_950, &ref_rate, &50));
    assert!(client.is_within_band(&10_050, &ref_rate, &50));
    assert!(!client.is_within_band(&9_949, &ref_rate, &50));
    assert!(!client.is_within_band(&10_051, &ref_rate, &50));
}
