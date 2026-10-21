use soroban_sdk::{symbol_short, Env};
use crate::{InvoiceExpiryReminderFlag, InvoiceExpiryReminderFlagClient};

#[test]
fn notification_dispatcher_scenario() {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);

    let inv_due_soon = symbol_short!("due_soon");
    let inv_due_later = symbol_short!("due_late");

    // Notification bot runs check on pending invoices
    if !client.was_reminded(&inv_due_soon) {
        let sent = client.mark_reminded(&inv_due_soon);
        assert!(sent);
    }

    // Subsequent worker run skips already reminded invoice
    assert!(client.was_reminded(&inv_due_soon));
    assert!(!client.was_reminded(&inv_due_later));
}
