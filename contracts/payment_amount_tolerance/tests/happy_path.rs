mod common;

use common::setup;

#[test]
fn accepts_payments_within_rounding_tolerance() {
    let (_, client) = setup();

    assert!(client.is_within_tolerance(&1_000_000, &1_000_000, &50));
    assert!(client.is_within_tolerance(&1_000_000, &999_960, &50));
    assert!(client.is_within_tolerance(&1_000_000, &1_000_040, &50));
}
