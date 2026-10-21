//! Scenario tests for `settlement-batch-id`.
//!
//! These cover the behaviour that matters in a real settlement run: the same
//! invoices always grouping together regardless of order, several batches
//! coexisting, and separate contract instances keeping separate batches.

mod common;

use settlement_batch_id::{SettlementBatchId, SettlementBatchIdClient};
use soroban_sdk::{symbol_short, vec, Env};

#[test]
fn the_same_invoices_group_under_the_same_batch_id() {
    let (env, client) = common::setup();
    let ordered = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];
    let reversed = vec![&env, symbol_short!("INV2"), symbol_short!("INV1")];

    let first = client.start_batch(&ordered, &5);
    let second = client.start_batch(&reversed, &5);

    assert_eq!(first, second);
}

#[test]
fn a_repeated_batch_does_not_create_a_second_copy() {
    let (env, client) = common::setup();
    let invoices = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];

    let first = client.start_batch(&invoices, &5);
    let second = client.start_batch(&invoices, &5);

    assert_eq!(first, second);
    assert_eq!(client.total_batches(), 1);
    assert_eq!(client.batch_size(&first), 2);
}

#[test]
fn different_invoice_sets_get_different_batch_ids() {
    let (env, client) = common::setup();
    let first = vec![&env, symbol_short!("INV1"), symbol_short!("INV2")];
    let second = vec![&env, symbol_short!("INV1"), symbol_short!("INV3")];

    let first_id = client.start_batch(&first, &5);
    let second_id = client.start_batch(&second, &5);

    assert_ne!(first_id, second_id);
    assert_eq!(client.total_batches(), 2);
}

#[test]
fn several_batches_coexist_without_touching_each_other() {
    let (env, client) = common::setup();
    let first = vec![&env, symbol_short!("INV1")];
    let second = vec![&env, symbol_short!("INV2")];
    let third = vec![&env, symbol_short!("INV3"), symbol_short!("INV4")];

    let first_id = client.start_batch(&first, &5);
    let second_id = client.start_batch(&second, &5);
    let third_id = client.start_batch(&third, &5);

    assert_eq!(client.batch_size(&first_id), 1);
    assert_eq!(client.batch_size(&second_id), 1);
    assert_eq!(client.batch_size(&third_id), 2);
    assert!(client.is_in_batch(&third_id, &symbol_short!("INV4")));
    assert!(!client.is_in_batch(&first_id, &symbol_short!("INV4")));
}

#[test]
fn a_large_batch_is_grouped_as_one_unit() {
    let (env, client) = common::setup();
    let mut invoices = soroban_sdk::Vec::new(&env);
    for index in 0..8 {
        invoices.push_back(soroban_sdk::Symbol::new(&env, &format!("INV{index}")));
    }

    let batch_id = client.start_batch(&invoices, &8);

    assert_eq!(client.batch_size(&batch_id), 8);
    for index in 0..8 {
        let invoice = soroban_sdk::Symbol::new(&env, &format!("INV{index}"));
        assert!(client.is_in_batch(&batch_id, &invoice));
    }
}

#[test]
fn two_contract_instances_keep_independent_batches() {
    let env = Env::default();
    env.mock_all_auths();

    let a_id = env.register(SettlementBatchId, ());
    let b_id = env.register(SettlementBatchId, ());
    let a = SettlementBatchIdClient::new(&env, &a_id);
    let b = SettlementBatchIdClient::new(&env, &b_id);

    let invoices = vec![&env, symbol_short!("INV1")];
    let batch_id = a.start_batch(&invoices, &5);

    assert_eq!(a.batch_size(&batch_id), 1);
    assert_eq!(b.batch_size(&batch_id), 0);
    assert_eq!(a.total_batches(), 1);
    assert_eq!(b.total_batches(), 0);
}
