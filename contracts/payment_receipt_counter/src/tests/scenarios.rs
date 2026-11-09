use super::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn counters_are_isolated_across_multiple_payers() {
    let (env, client) = setup();
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    client.record_payment(&p1);
    client.record_payment(&p1);
    client.record_payment(&p2);

    assert_eq!(client.count_for(&p1), 2);
    assert_eq!(client.count_for(&p2), 1);
}
