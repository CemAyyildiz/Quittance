use crate::{InvoiceStatusHistory, InvoiceStatusHistoryClient, Status, Transition};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger as _},
    Address, Env,
};

#[test]
fn appends_and_returns_transitions_in_order() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);
    env.mock_all_auths();
    let invoice = symbol_short!("INV1");
    env.ledger().set_timestamp(100);
    client.append(&invoice, &Status::Pending, &Status::Paid);
    env.ledger().set_timestamp(101);
    client.append(&invoice, &Status::Paid, &Status::Cancelled);

    let history = client.history_of(&invoice);
    assert_eq!(history.len(), 2);
    assert_eq!(
        history.get(0),
        Some(Transition {
            from: Status::Pending,
            to: Status::Paid,
            at: 100
        })
    );
    assert_eq!(
        history.get(1),
        Some(Transition {
            from: Status::Paid,
            to: Status::Cancelled,
            at: 101
        })
    );
}
