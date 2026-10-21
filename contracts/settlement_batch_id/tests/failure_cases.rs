//! Failure and error-case tests for `settlement-batch-id`.
//!
//! These cover the ways the contract can refuse to start a batch, and the
//! guarantee that a refused batch leaves no trace behind.

mod common;

use settlement_batch_id::BatchError;
use soroban_sdk::{symbol_short, vec};

#[test]
fn the_error_discriminants_are_stable() {
    assert_eq!(BatchError::EmptyBatch as u32, 1);
    assert_eq!(BatchError::InvalidMaxSize as u32, 2);
    assert_eq!(BatchError::MaxSizeTooLarge as u32, 3);
    assert_eq!(BatchError::BatchTooLarge as u32, 4);
    assert_eq!(BatchError::DuplicateInvoice as u32, 5);
}

#[test]
fn the_error_messages_are_stable() {
    assert_eq!(
        BatchError::EmptyBatch.message(),
        "A settlement batch must contain at least one invoice."
    );
    assert_eq!(
        BatchError::InvalidMaxSize.message(),
        "Maximum batch size must be at least one."
    );
    assert_eq!(
        BatchError::MaxSizeTooLarge.message(),
        "Maximum batch size exceeds the supported limit."
    );
    assert_eq!(
        BatchError::BatchTooLarge.message(),
        "Batch contains more invoices than its maximum size."
    );
    assert_eq!(
        BatchError::DuplicateInvoice.message(),
        "The same invoice id cannot appear twice in one batch."
    );
}

#[test]
fn an_empty_batch_is_rejected() {
    let (env, client) = common::setup();
    let invoices = vec![&env];

    assert_eq!(
        client.try_start_batch(&invoices, &5),
        Err(Ok(BatchError::EmptyBatch))
    );
}

#[test]
fn a_zero_max_size_is_rejected() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1")];

    assert_eq!(
        client.try_start_batch(&invoices, &0),
        Err(Ok(BatchError::InvalidMaxSize))
    );
}

#[test]
fn more_invoices_than_the_cap_are_rejected() {
    let (env, client) = common::setup();
    let invoices = vec![
        &env,
        symbol_short!("INV1"),
        symbol_short!("INV2"),
        symbol_short!("INV3"),
    ];

    assert_eq!(
        client.try_start_batch(&invoices, &2),
        Err(Ok(BatchError::BatchTooLarge))
    );
}

#[test]
fn a_duplicated_invoice_is_rejected() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV1")];

    assert_eq!(
        client.try_start_batch(&invoices, &5),
        Err(Ok(BatchError::DuplicateInvoice))
    );
}

#[test]
fn a_rejected_batch_is_not_stored() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV1")];

    let _ = client.try_start_batch(&invoices, &5);

    assert_eq!(client.total_batches(), 0);
}
