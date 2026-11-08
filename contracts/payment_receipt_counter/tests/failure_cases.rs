mod common;

use common::setup;
use payment_receipt_counter::{ReceiptCounterError, MAX_BATCH_INCREMENT};
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn rejects_zero_or_excessive_batch_increments() {
    let (env, client) = setup();
    let payer = Address::generate(&env);

    assert_eq!(
        client.try_record_batch(&payer, &0),
        Err(Ok(ReceiptCounterError::InvalidBatchSize))
    );
    assert_eq!(
        client.try_record_batch(&payer, &(MAX_BATCH_INCREMENT + 1)),
        Err(Ok(ReceiptCounterError::InvalidBatchSize))
    );
}
