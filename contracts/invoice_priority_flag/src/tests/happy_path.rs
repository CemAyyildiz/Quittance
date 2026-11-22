use crate::{InvoicePriorityFlag, InvoicePriorityFlagClient, Priority};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn sets_priority_for_an_untagged_invoice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    assert_eq!(client.priority_of(&invoice), None);

    client.set_priority(&seller, &invoice, &Priority::Urgent);

    assert_eq!(client.priority_of(&invoice), Some(Priority::Urgent));
}

#[test]
fn stored_priority_is_stable_across_reads() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    client.set_priority(&seller, &invoice, &Priority::Normal);

    assert_eq!(client.priority_of(&invoice), Some(Priority::Normal));
    assert_eq!(client.priority_of(&invoice), Some(Priority::Normal));
    assert_eq!(client.priority_of(&invoice), Some(Priority::Normal));
}

#[test]
fn seller_can_flag_several_invoices() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let first = symbol_short!("INV1");
    let second = symbol_short!("INV2");

    client.set_priority(&seller, &first, &Priority::Low);
    client.set_priority(&seller, &second, &Priority::Urgent);

    assert_eq!(client.priority_of(&first), Some(Priority::Low));
    assert_eq!(client.priority_of(&second), Some(Priority::Urgent));
}
