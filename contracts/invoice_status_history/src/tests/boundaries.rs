use crate::{InvoiceStatusHistory, InvoiceStatusHistoryClient, Status};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};

#[test]
fn unknown_invoice_has_empty_history() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);

    assert!(client.history_of(&symbol_short!("UNKNOWN")).is_empty());
}

#[test]
fn maximum_length_symbol_is_a_valid_invoice_id() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);
    env.mock_all_auths();
    let invoice = Symbol::new(&env, "ABCDEFGHIJKLMNOPQRSTUVWX12345678");

    client.append(&invoice, &Status::Pending, &Status::Expired);
    assert_eq!(client.history_of(&invoice).len(), 1);
}
