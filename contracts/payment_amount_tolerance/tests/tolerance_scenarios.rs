mod common;

use common::setup;

#[test]
fn zero_tolerance_requires_exact_amount_match() {
    let (_, client) = setup();

    let eval = client.require_within_tolerance(&500_000, &500_000, &0);
    assert_eq!(eval.abs_difference, 0);
    assert!(eval.within_tolerance);
    assert!(!client.is_within_tolerance(&500_000, &499_999, &0));
}
