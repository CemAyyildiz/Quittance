mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Ledger};

#[test]
fn tracks_multiple_invoices_and_ledger_sequences() {
    let (env, client) = setup();
    env.ledger().with_mut(|l| l.sequence_number = 42);

    let inv_a = symbol_short!("INVA");
    let inv_b = symbol_short!("INVB");

    assert!(client.mark_reminded(&inv_a));
    env.ledger().with_mut(|l| l.sequence_number = 99);
    assert!(client.mark_reminded(&inv_b));

    assert_eq!(client.reminder_record(&inv_a).reminded_at_ledger, 42);
    assert_eq!(client.reminder_record(&inv_b).reminded_at_ledger, 99);
    assert_eq!(client.total_reminded_count(), 2);
}
