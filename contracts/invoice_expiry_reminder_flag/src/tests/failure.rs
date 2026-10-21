use soroban_sdk::{symbol_short, Env};
use crate::{InvoiceExpiryReminderFlag, InvoiceExpiryReminderFlagClient};

#[test]
fn repeated_mark_reminded_returns_false() {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);

    let invoice = symbol_short!("inv_dup");

    // First call sets flag and returns true
    assert!(client.mark_reminded(&invoice));

    // Second call indicates already reminded (one-shot behavior)
    assert!(!client.mark_reminded(&invoice));

    // State remains true
    assert!(client.was_reminded(&invoice));
}
