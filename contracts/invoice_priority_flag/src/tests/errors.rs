use crate::{Error, InvoicePriorityFlag, InvoicePriorityFlagClient, Priority};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn rejects_a_second_set_with_the_same_priority() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    client.set_priority(&seller, &invoice, &Priority::Normal);
    assert_eq!(
        client
            .try_set_priority(&seller, &invoice, &Priority::Normal)
            .unwrap_err()
            .unwrap(),
        Error::AlreadySet
    );
    assert_eq!(client.priority_of(&invoice), Some(Priority::Normal));
}

#[test]
fn rejects_overwriting_the_priority() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    client.set_priority(&seller, &invoice, &Priority::Urgent);

    for priority in [Priority::Normal, Priority::Low, Priority::Urgent] {
        assert_eq!(
            client
                .try_set_priority(&seller, &invoice, &priority)
                .unwrap_err()
                .unwrap(),
            Error::AlreadySet
        );
        assert_eq!(client.priority_of(&invoice), Some(Priority::Urgent));
    }
}

#[test]
fn rejects_a_second_set_by_a_different_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let first_seller = Address::generate(&env);
    let second_seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    client.set_priority(&first_seller, &invoice, &Priority::Low);

    assert_eq!(
        client
            .try_set_priority(&second_seller, &invoice, &Priority::Urgent)
            .unwrap_err()
            .unwrap(),
        Error::AlreadySet
    );
    assert_eq!(client.priority_of(&invoice), Some(Priority::Low));
}

#[test]
fn rejects_a_set_without_seller_authorization() {
    let env = Env::default();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    assert!(client
        .try_set_priority(&seller, &invoice, &Priority::Urgent)
        .is_err());
    assert_eq!(client.priority_of(&invoice), None);
}
