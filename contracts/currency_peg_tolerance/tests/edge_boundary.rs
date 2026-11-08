mod common;

use common::setup;

#[test]
fn exact_band_boundaries_are_inclusive() {
    let (_, client) = setup();
    let reference = 10_000_000i128;

    // Exact lower and upper bounds at 50 bps (0.5%): 9_950_000 and 10_050_000
    assert!(client.is_within_band(&9_950_000, &reference, &50));
    assert!(client.is_within_band(&10_050_000, &reference, &50));
    assert!(!client.is_within_band(&9_949_999, &reference, &50));
    assert!(!client.is_within_band(&10_050_001, &reference, &50));
}

#[test]
fn zero_tolerance_requires_exact_match() {
    let (_, client) = setup();
    let reference = 10_000_000i128;

    assert!(client.is_within_band(&reference, &reference, &0));
    assert!(!client.is_within_band(&(reference - 1), &reference, &0));
    assert!(!client.is_within_band(&(reference + 1), &reference, &0));
}
