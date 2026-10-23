use crate::{InvoiceAmountHistory, InvoiceAmountHistoryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn adjustments_telescope_to_the_net_amount_change() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &1_000, &1_500, &10);
    client.record_adjustment(&invoice, &1_500, &1_200, &11);
    client.record_adjustment(&invoice, &1_200, &2_000, &12);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 3);

    let first = history.get(0).unwrap();
    let last = history.get(2).unwrap();
    let mut delta_sum = 0_i128;
    for change in history.iter() {
        // Deltas use the same unit as the invoice amount, so increases and
        // decreases must cancel out exactly.
        delta_sum += change.new_amount - change.old_amount;
    }

    assert_eq!(delta_sum, last.new_amount - first.old_amount);
    assert_eq!(delta_sum, 1_000);
}

#[test]
fn each_invoice_keeps_an_independent_trail() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let first = symbol_short!("FIRST");
    let second = symbol_short!("SECOND");

    client.record_adjustment(&first, &0, &100, &1);
    client.record_adjustment(&second, &0, &900, &1);
    client.record_adjustment(&first, &100, &250, &2);

    let first_history = client.history_for(&first);
    let second_history = client.history_for(&second);
    assert_eq!(first_history.len(), 2);
    assert_eq!(second_history.len(), 1);
    assert_eq!(first_history.get(1).unwrap().new_amount, 250);
    assert_eq!(second_history.get(0).unwrap().new_amount, 900);
    assert_eq!(second_history.get(0).unwrap().ledger, 1);
}

#[test]
fn ledger_sequence_of_every_adjustment_is_preserved() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &0, &5, &3);
    client.record_adjustment(&invoice, &5, &10, &8);
    client.record_adjustment(&invoice, &10, &15, &8);
    client.record_adjustment(&invoice, &15, &20, &21);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 4);
    assert_eq!(history.get(0).unwrap().ledger, 3);
    assert_eq!(history.get(1).unwrap().ledger, 8);
    assert_eq!(history.get(2).unwrap().ledger, 8);
    assert_eq!(history.get(3).unwrap().ledger, 21);
}
