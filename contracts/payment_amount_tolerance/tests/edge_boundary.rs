mod common;

use common::setup;

#[test]
fn exact_tolerance_boundaries_are_inclusive() {
    let (_, client) = setup();

    assert!(client.is_within_tolerance(&1_000, &990, &10));
    assert!(client.is_within_tolerance(&1_000, &1_010, &10));
    assert!(!client.is_within_tolerance(&1_000, &989, &10));
    assert!(!client.is_within_tolerance(&1_000, &1_011, &10));
}
