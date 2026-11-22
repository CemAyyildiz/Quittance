use crate::{Error, InvoiceAmountHistory, InvoiceAmountHistoryClient};
use soroban_sdk::{symbol_short, Env};

fn setup(env: &Env) -> (InvoiceAmountHistoryClient<'_>, soroban_sdk::Symbol) {
    let contract_id = env.register(InvoiceAmountHistory, ());
    let client = InvoiceAmountHistoryClient::new(env, &contract_id);
    (client, symbol_short!("INV1"))
}

#[test]
fn rejects_an_unchanged_amount_without_mutation() {
    let env = Env::default();
    let (client, invoice) = setup(&env);

    assert_eq!(
        client
            .try_record_adjustment(&invoice, &500, &500, &1)
            .unwrap_err()
            .unwrap(),
        Error::UnchangedAmount
    );
    assert!(client.history_for(&invoice).is_empty());

    client.record_adjustment(&invoice, &500, &600, &1);
    assert_eq!(
        client
            .try_record_adjustment(&invoice, &600, &600, &2)
            .unwrap_err()
            .unwrap(),
        Error::UnchangedAmount
    );
    assert_eq!(client.history_for(&invoice).len(), 1);
}

#[test]
fn rejects_negative_old_and_new_amounts() {
    let env = Env::default();
    let (client, invoice) = setup(&env);

    assert_eq!(
        client
            .try_record_adjustment(&invoice, &-1, &100, &1)
            .unwrap_err()
            .unwrap(),
        Error::NegativeAmount
    );
    assert_eq!(
        client
            .try_record_adjustment(&invoice, &100, &-1, &1)
            .unwrap_err()
            .unwrap(),
        Error::NegativeAmount
    );
    assert!(client.history_for(&invoice).is_empty());
}

#[test]
fn negative_amount_takes_precedence_over_other_errors() {
    let env = Env::default();
    let (client, invoice) = setup(&env);

    assert_eq!(
        client
            .try_record_adjustment(&invoice, &-5, &-5, &0)
            .unwrap_err()
            .unwrap(),
        Error::NegativeAmount
    );
    assert!(client.history_for(&invoice).is_empty());
}

#[test]
fn rejects_ledger_zero_and_keeps_existing_history() {
    let env = Env::default();
    let (client, invoice) = setup(&env);

    client.record_adjustment(&invoice, &100, &200, &9);
    assert_eq!(
        client
            .try_record_adjustment(&invoice, &200, &300, &0)
            .unwrap_err()
            .unwrap(),
        Error::InvalidLedger
    );

    let history = client.history_for(&invoice);
    assert_eq!(history.len(), 1);
    assert_eq!(history.get(0).unwrap().ledger, 9);
}
