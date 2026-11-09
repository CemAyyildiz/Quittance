use super::setup;
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn record_reminder_returns_typed_errors_on_duplicate_or_empty() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_DUP");

    client.record_reminder(&inv);
    assert_eq!(
        client.try_record_reminder(&inv),
        Err(Ok(Error::AlreadyReminded))
    );
    assert_eq!(
        client.try_record_reminder(&symbol_short!("EMPTY")),
        Err(Ok(Error::InvalidInvoiceId))
    );
}
