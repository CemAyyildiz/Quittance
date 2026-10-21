use soroban_sdk::{symbol_short, Env};
use crate::{InvoiceExpiryReminderFlag, InvoiceExpiryReminderFlagClient};

#[test]
fn unreminded_invoice_always_returns_false() {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);

    let invoice = symbol_short!("virgin");
    assert!(!client.was_reminded(&invoice));
}

#[test]
fn multiple_unrelated_queries_do_not_mutate_state() {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);

    let inv = symbol_short!("test_inv");
    for _ in 0..5 {
        assert!(!client.was_reminded(&inv));
    }
}
