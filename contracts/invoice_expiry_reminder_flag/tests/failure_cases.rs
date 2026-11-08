mod common;

use common::setup;
use invoice_expiry_reminder_flag::ReminderFlagError;
use soroban_sdk::symbol_short;

#[test]
fn try_mark_once_and_missing_record_return_errors() {
    let (_, client) = setup();
    let inv = symbol_short!("INV303");

    assert_eq!(
        client.try_reminder_record(&inv),
        Err(Ok(ReminderFlagError::NotReminded))
    );

    let rec = client.try_mark_once(&inv).unwrap().unwrap();
    assert_eq!(rec.invoice_id, inv);

    assert_eq!(
        client.try_try_mark_once(&inv),
        Err(Ok(ReminderFlagError::AlreadyReminded))
    );
}
