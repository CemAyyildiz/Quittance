use crate::{AmountChange, InvoiceAmountHistory, InvoiceAmountHistoryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn records_adjustments_in_append_order() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &1_000_000_000, &1_500_000_000, &42);
    client.record_adjustment(&invoice, &1_500_000_000, &1_200_000_000, &57);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 2);
    assert_eq!(
        history.get(0),
        Some(AmountChange {
            old_amount: 1_000_000_000,
            new_amount: 1_500_000_000,
            ledger: 42,
        })
    );
    assert_eq!(
        history.get(1),
        Some(AmountChange {
            old_amount: 1_500_000_000,
            new_amount: 1_200_000_000,
            ledger: 57,
        })
    );
}

#[test]
fn history_is_empty_until_the_first_adjustment_is_recorded() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    assert!(client.history_for(&invoice).is_empty());

    client.record_adjustment(&invoice, &0, &25_000_000, &7);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 1);
    assert_eq!(
        history.get(0),
        Some(AmountChange {
            old_amount: 0,
            new_amount: 25_000_000,
            ledger: 7,
        })
    );
}

#[test]
fn zero_amount_invoice_can_grow_through_adjustments() {
    let env = Env::default();
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    client.record_adjustment(&invoice, &0, &10, &1);
    client.record_adjustment(&invoice, &10, &20, &2);

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 2);
    assert_eq!(history.get(1).unwrap().new_amount, 20);
}
