//! Edge and boundary-case tests for `settlement-batch-id`.
//!
//! These cover the exact edges of the batch rules: a single invoice, a batch
//! filled to its cap, and the cap itself.

mod common;

use settlement_batch_id::{BatchError, MAX_BATCH_SIZE};
use soroban_sdk::{symbol_short, vec, Symbol, Vec};

#[test]
fn a_single_invoice_batch_is_allowed() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1")];

    let batch_id = client.start_batch(&invoices, &1);

    assert_eq!(client.batch_size(&batch_id), 1);
}

#[test]
fn a_batch_filled_exactly_to_its_cap_is_allowed() {
    let (env, client) = common::setup();
    let invoices = vec![
        &env,
        symbol_short!("INV1"),
        symbol_short!("INV2"),
        symbol_short!("INV3"),
    ];

    let batch_id = client.start_batch(&invoices, &3);

    assert_eq!(client.batch_size(&batch_id), 3);
}

#[test]
fn the_largest_supported_batch_is_allowed() {
    let (env, client) = common::setup();
    let mut invoices = Vec::new(&env);
    for index in 0..MAX_BATCH_SIZE {
        invoices.push_back(Symbol::new(&env, &format!("INV{index}")));
    }

    let batch_id = client.start_batch(&invoices, &MAX_BATCH_SIZE);

    assert_eq!(client.batch_size(&batch_id), MAX_BATCH_SIZE);
}

#[test]
fn a_max_size_above_the_supported_limit_is_rejected() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1")];

    assert_eq!(
        client.try_start_batch(&invoices, &(MAX_BATCH_SIZE + 1)),
        Err(Ok(BatchError::MaxSizeTooLarge))
    );
}

#[test]
fn the_max_size_limit_is_ten() {
    assert_eq!(MAX_BATCH_SIZE, 10);
}

#[test]
fn an_unknown_batch_reports_no_invoices() {
    let (env, client) = common::setup();
    let unknown = Symbol::new(&env, "B0b0b0b0b0b0b0b0");

    assert_eq!(client.batch_size(&unknown), 0);
    assert_eq!(client.batch_invoices(&unknown).len(), 0);
    assert!(!client.is_in_batch(&unknown, &symbol_short!("INV1")));
}
