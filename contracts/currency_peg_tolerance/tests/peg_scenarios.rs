mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn stores_and_reads_default_tolerance_bps() {
    let (env, client) = setup();
    let admin = Address::generate(&env);

    assert_eq!(client.default_tolerance(), 100);
    client.set_default_tolerance(&admin, &250);
    assert_eq!(client.default_tolerance(), 250);

    let tol = client.default_tolerance();
    assert!(client.is_within_band(&9_800_000, &10_000_000, &tol));
    assert!(!client.is_within_band(&9_700_000, &10_000_000, &tol));
}
