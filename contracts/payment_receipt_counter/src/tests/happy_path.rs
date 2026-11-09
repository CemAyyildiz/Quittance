use super::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn increments_payment_counter_monotonically_for_payer() {
    let (env, client) = setup();
    let payer = Address::generate(&env);

    assert_eq!(client.count_for(&payer), 0);
    assert_eq!(client.record_payment(&payer), 1);
    assert_eq!(client.record_payment(&payer), 2);
    assert_eq!(client.count_for(&payer), 2);
}
