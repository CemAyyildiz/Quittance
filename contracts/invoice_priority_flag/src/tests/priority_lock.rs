use crate::{InvoicePriorityFlag, InvoicePriorityFlagClient, Priority};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn priority_is_fixed_after_creation() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = symbol_short!("INV1");

    // A seller chooses Low at creation time.
    client.set_priority(&seller, &invoice, &Priority::Low);

    // Urgent and Normal are common attempts to re-rank an invoice later.
    assert!(client
        .try_set_priority(&seller, &invoice, &Priority::Urgent)
        .is_err());
    assert!(client
        .try_set_priority(&seller, &invoice, &Priority::Normal)
        .is_err());

    // The value downstream sorting and display rely on never changes.
    assert_eq!(client.priority_of(&invoice), Some(Priority::Low));
}

#[test]
fn each_invoice_has_its_own_priority_lock() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    let urgent = symbol_short!("URGENT");
    let normal = symbol_short!("NORMAL");
    let low = symbol_short!("LOW");

    client.set_priority(&seller, &urgent, &Priority::Urgent);
    client.set_priority(&seller, &normal, &Priority::Normal);
    client.set_priority(&seller, &low, &Priority::Low);

    // A rejected change on one invoice leaves the others untouched.
    assert!(client
        .try_set_priority(&seller, &normal, &Priority::Urgent)
        .is_err());

    assert_eq!(client.priority_of(&urgent), Some(Priority::Urgent));
    assert_eq!(client.priority_of(&normal), Some(Priority::Normal));
    assert_eq!(client.priority_of(&low), Some(Priority::Low));
}

#[test]
fn every_priority_can_be_chosen_exactly_once() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    for (invoice, priority) in [
        (symbol_short!("ONE"), Priority::Urgent),
        (symbol_short!("TWO"), Priority::Normal),
        (symbol_short!("THREE"), Priority::Low),
    ] {
        client.set_priority(&seller, &invoice, &priority);
        assert_eq!(client.priority_of(&invoice), Some(priority));
        assert!(client
            .try_set_priority(&seller, &invoice, &Priority::Urgent)
            .is_err());
        assert_eq!(client.priority_of(&invoice), Some(priority));
    }
}
