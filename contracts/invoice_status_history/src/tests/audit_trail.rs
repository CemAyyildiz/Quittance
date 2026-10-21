use crate::{InvoiceStatusHistory, InvoiceStatusHistoryClient, Status};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn interleaved_invoices_keep_independent_histories() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceStatusHistory, (admin,));
    let client = InvoiceStatusHistoryClient::new(&env, &contract_id);
    env.mock_all_auths();
    let first = symbol_short!("FIRST");
    let second = symbol_short!("SECOND");

    client.append(&first, &Status::Pending, &Status::Paid);
    client.append(&second, &Status::Pending, &Status::Expired);
    client.append(&first, &Status::Paid, &Status::Cancelled);

    let first_history = client.history_of(&first);
    let second_history = client.history_of(&second);
    assert_eq!(first_history.len(), 2);
    assert_eq!(second_history.len(), 1);
    assert_eq!(first_history.get(1).unwrap().from, Status::Paid);
    assert_eq!(second_history.get(0).unwrap().to, Status::Expired);
}
