use crate::{AmountChange, InvoiceAmountHistory, InvoiceAmountHistoryClient};
use soroban_sdk::{symbol_short, Env, Symbol};

#[test]
fn unknown_invoice_has_empty_history() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);

    assert!(client.history_for(&symbol_short!("UNKNOWN")).is_empty());
}

#[test]
fn zero_amounts_are_valid_on_both_sides() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &0, &1, &1);
    client.record_adjustment(&invoice, &1, &0, &2);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 2);
    assert_eq!(
        history.get(1),
        Some(AmountChange {
            old_amount: 1,
            new_amount: 0,
            ledger: 2,
        })
    );
}

#[test]
fn largest_i128_amount_is_accepted() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &0, &i128::MAX, &1);
    client.record_adjustment(&invoice, &i128::MAX, &0, &2);

    let history = client.history_for(&invoice);
    assert_eq!(history.get(0).unwrap().new_amount, i128::MAX);
    assert_eq!(history.get(1).unwrap().old_amount, i128::MAX);
}

#[test]
fn largest_ledger_sequence_is_accepted() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &5, &6, &u32::MAX);

    assert_eq!(
        client.history_for(&invoice).get(0).unwrap().ledger,
        u32::MAX
    );
}

#[test]
fn maximum_length_symbol_is_a_valid_invoice_id() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "ABCDEFGHIJKLMNOPQRSTUVWX12345678");

    client.record_adjustment(&invoice, &1, &2, &1);

    assert_eq!(client.history_for(&invoice).len(), 1);
}
