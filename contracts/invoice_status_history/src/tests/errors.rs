use crate::{Error, InvoiceStatusHistory, InvoiceStatusHistoryClient, Status};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn rejects_unchanged_and_disconnected_transitions_without_mutation() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);
    env.mock_all_auths();
    let invoice = symbol_short!("INV1");

    assert_eq!(
        client
            .try_append(&invoice, &Status::Pending, &Status::Pending)
            .unwrap_err()
            .unwrap(),
        Error::UnchangedStatus
    );
    assert!(client.history_of(&invoice).is_empty());

    client.append(&invoice, &Status::Pending, &Status::Paid);
    assert_eq!(
        client
            .try_append(&invoice, &Status::Expired, &Status::Cancelled)
            .unwrap_err()
            .unwrap(),
        Error::DisconnectedTransition
    );
    assert_eq!(client.history_of(&invoice).len(), 1);
}

#[test]
fn rejects_append_without_admin_authorization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV1");

    assert!(client
        .try_append(&invoice, &Status::Pending, &Status::Paid)
        .is_err());
    assert!(client.history_of(&invoice).is_empty());
}
