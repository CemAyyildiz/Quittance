use super::setup;
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn republishing_or_empty_invoice_id_returns_error() {
    let (_env, client, seller) = setup();
    let inv = symbol_short!("INV_DUP");

    client.publish(&seller, &inv);
    assert_eq!(
        client.try_publish(&seller, &inv),
        Err(Ok(Error::AlreadyPublished))
    );
    assert_eq!(
        client.try_publish(&seller, &symbol_short!("EMPTY")),
        Err(Ok(Error::InvalidInvoiceId))
    );
}
