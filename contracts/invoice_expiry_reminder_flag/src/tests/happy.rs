use soroban_sdk::{symbol_short, Env};
use crate::{InvoiceExpiryReminderFlag, InvoiceExpiryReminderFlagClient};

#[test]
fn marks_reminded_once_successfully() {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);

    let invoice = symbol_short!("inv_1");
    assert!(!client.was_reminded(&invoice));

    assert!(client.mark_reminded(&invoice));
    assert!(client.was_reminded(&invoice));
}
