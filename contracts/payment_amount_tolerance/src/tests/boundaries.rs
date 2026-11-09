//! Boundary tests for `payment-amount-tolerance`.

use super::setup;

#[test]
fn exact_lower_and_upper_tolerance_bounds_pass_while_one_stroop_beyond_fails() {
    let (_env, client) = setup();
    let expected = 10_000_i128;
    let tol = 10_i128;

    assert!(client.is_within_tolerance(&expected, &9_990, &tol));
    assert!(client.is_within_tolerance(&expected, &10_010, &tol));
    assert!(!client.is_within_tolerance(&expected, &9_989, &tol));
    assert!(!client.is_within_tolerance(&expected, &10_011, &tol));
}

#[test]
fn zero_tolerance_requires_exact_amount_and_handles_i128_max() {
    let (_env, client) = setup();
    assert!(client.is_within_tolerance(&500, &500, &0));
    assert!(!client.is_within_tolerance(&500, &499, &0));
    assert!(!client.is_within_tolerance(&500, &501, &0));

    assert!(client.is_within_tolerance(&i128::MAX, &(i128::MAX - 3), &5));
}
