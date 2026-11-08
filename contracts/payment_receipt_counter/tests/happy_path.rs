mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn records_and_queries_per_payer_payment_counts() {
    let (env, client) = setup();
    let payer_a = Address::generate(&env);
    let payer_b = Address::generate(&env);

    assert_eq!(client.count_for(&payer_a), 0);
    assert_eq!(client.record_payment(&payer_a), 1);
    assert_eq!(client.record_payment(&payer_a), 2);
    assert_eq!(client.record_payment(&payer_b), 1);

    assert_eq!(client.count_for(&payer_a), 2);
    assert_eq!(client.count_for(&payer_b), 1);
    assert_eq!(client.global_count(), 3);
}
