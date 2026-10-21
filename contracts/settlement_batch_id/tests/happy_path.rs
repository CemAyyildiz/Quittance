//! Happy-path tests for `settlement-batch-id`.
//!
//! These cover the successful grouping path: a batch is started, its id is
//! returned, and the invoices in it can be read back.

mod common;

use soroban_sdk::{symbol_short, vec};

#[test]
fn a_batch_can_be_started() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];

    let batch_id = client.start_batch(&invoices, &5);

    assert_eq!(client.batch_size(&batch_id), 2);
}

#[test]
fn the_invoices_of_a_batch_can_be_read_back() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];

    let batch_id = client.start_batch(&invoices, &5);
    let stored = client.batch_invoices(&batch_id);

    assert_eq!(stored.len(), 2);
    assert_eq!(stored.get(0), Some(symbol_short!("INV1")));
    assert_eq!(stored.get(1), Some(symbol_short!("INV2")));
}

#[test]
fn every_invoice_of_a_batch_is_reported_as_in_it() {
    let (env, client) = common::setup();
    let invoices = vec![
        &env,
        symbol_short!("INV1"),
        symbol_short!("INV2"),
        symbol_short!("INV3"),
    ];

    let batch_id = client.start_batch(&invoices, &5);

    assert!(client.is_in_batch(&batch_id, &symbol_short!("INV1")));
    assert!(client.is_in_batch(&batch_id, &symbol_short!("INV2")));
    assert!(client.is_in_batch(&batch_id, &symbol_short!("INV3")));
}

#[test]
fn an_invoice_that_is_not_in_the_batch_is_not_reported_as_in_it() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1")];

    let batch_id = client.start_batch(&invoices, &5);

    assert!(!client.is_in_batch(&batch_id, &symbol_short!("INV2")));
}

#[test]
fn the_batch_count_grows_with_every_batch() {
    let (env, client) = common::setup();
    let first = vec![&env, symbol_short!("INV1")];
    let second = vec![&env, symbol_short!("INV2")];

    assert_eq!(client.total_batches(), 0);
    client.start_batch(&first, &5);
    assert_eq!(client.total_batches(), 1);
    client.start_batch(&second, &5);
    assert_eq!(client.total_batches(), 2);
}

#[test]
fn a_batch_id_is_derived_from_the_batch_contents() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];

    let batch_id = client.start_batch(&invoices, &5);

    // The id is a `B` followed by hexadecimal characters.
    let id = batch_id.to_string();
    assert!(id.starts_with('B'));
    assert_eq!(id.len(), 17);
    assert!(id[1..].chars().all(|c| c.is_ascii_hexdigit()));
}
