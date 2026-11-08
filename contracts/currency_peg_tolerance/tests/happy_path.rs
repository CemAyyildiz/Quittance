mod common;

use common::setup;

#[test]
fn accepts_rates_within_tolerance_band() {
    let (_, client) = setup();
    let reference = 10_000_000i128; // 1.0000000 scaled by 1e7

    // 100 bps = 1% -> [9_900_000, 10_100_000]
    assert!(client.is_within_band(&10_000_000, &reference, &100));
    assert!(client.is_within_band(&9_950_000, &reference, &100));
    assert!(client.is_within_band(&10_050_000, &reference, &100));

    let eval = client.evaluate_band(&9_950_000, &reference, &100);
    assert!(eval.within_band);
    assert_eq!(eval.lower_bound, 9_900_000);
    assert_eq!(eval.upper_bound, 10_100_000);
}
