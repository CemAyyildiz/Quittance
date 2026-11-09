use super::setup;

#[test]
fn zero_tolerance_requires_exact_peg_match() {
    let (_env, client) = setup();
    assert!(client.is_within_band(&1_000_000, &1_000_000, &0));
    assert!(!client.is_within_band(&1_000_001, &1_000_000, &0));
}
