//! Happy-path tests for `payment-amount-tolerance`.

use super::setup;
use crate::ToleranceReport;

#[test]
fn exact_match_and_small_under_or_overpayment_within_tolerance_are_accepted() {
    let (_env, client) = setup();

    // Expected 100.0000000 USDC (1_000_000_000 stroops), tolerance 50 stroops
    let expected = 1_000_000_000_i128;
    let tol = 50_i128;

    assert!(client.is_within_tolerance(&expected, &expected, &tol));
    assert!(client.is_within_tolerance(&expected, &(expected - 25), &tol));
    assert!(client.is_within_tolerance(&expected, &(expected + 30), &tol));

    assert_eq!(client.verify_within_tolerance(&expected, &(expected - 25), &tol), -25);
    assert_eq!(
        client.evaluate(&expected, &(expected - 25), &tol),
        ToleranceReport {
            accepted: true,
            abs_diff: 25,
        }
    );
}
