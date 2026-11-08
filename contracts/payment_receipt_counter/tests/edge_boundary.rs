mod common;

use common::setup;
use payment_receipt_counter::MAX_BATCH_INCREMENT;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn allows_exact_max_batch_increment() {
    let (env, client) = setup();
    let payer = Address::generate(&env);

    let count = client.record_batch(&payer, &MAX_BATCH_INCREMENT);
    assert_eq!(count, MAX_BATCH_INCREMENT);
    assert_eq!(client.count_for(&payer), MAX_BATCH_INCREMENT);
}
