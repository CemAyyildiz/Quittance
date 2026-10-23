use crate::{InvoicePriorityFlag, InvoicePriorityFlagClient, Priority};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};

#[test]
fn unknown_invoice_has_no_priority() {
    let env = Env::default();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);

    assert_eq!(client.priority_of(&symbol_short!("MISSING")), None);
}

#[test]
fn every_priority_variant_round_trips() {
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

    assert_eq!(client.priority_of(&urgent), Some(Priority::Urgent));
    assert_eq!(client.priority_of(&normal), Some(Priority::Normal));
    assert_eq!(client.priority_of(&low), Some(Priority::Low));
}

#[test]
fn single_character_symbol_is_a_valid_invoice_id() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = Symbol::new(&env, "I");

    client.set_priority(&seller, &invoice, &Priority::Normal);

    assert_eq!(client.priority_of(&invoice), Some(Priority::Normal));
}

#[test]
fn maximum_length_symbol_is_a_valid_invoice_id() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    let invoice = Symbol::new(&env, "ABCDEFGHIJKLMNOPQRSTUVWX12345678");

    client.set_priority(&seller, &invoice, &Priority::Low);

    assert_eq!(client.priority_of(&invoice), Some(Priority::Low));
}

#[test]
fn priorities_are_independent_per_invoice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoicePriorityFlag, ());
    let client = InvoicePriorityFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_priority(&seller, &symbol_short!("FIRST"), &Priority::Urgent);
    client.set_priority(&seller, &symbol_short!("SECOND"), &Priority::Low);

    assert_eq!(
        client.priority_of(&symbol_short!("FIRST")),
        Some(Priority::Urgent)
    );
    assert_eq!(
        client.priority_of(&symbol_short!("SECOND")),
        Some(Priority::Low)
    );
}
