//! Rejection tests for already-void, paid, expired, or unauthorized invoices.

use super::{new_seller, setup};
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn voiding_already_void_paid_or_expired_invoice_is_rejected() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    // 1. Already void
    let inv_void = symbol_short!("INV_V");
    client.void_invoice(&seller, &inv_void);
    assert_eq!(
        client.try_void_invoice(&seller, &inv_void),
        Err(Ok(Error::AlreadyVoid))
    );

    // 2. Already paid
    let inv_paid = symbol_short!("INV_P");
    client.mark_paid(&inv_paid);
    assert_eq!(
        client.try_void_invoice(&seller, &inv_paid),
        Err(Ok(Error::AlreadyPaid))
    );
    assert!(!client.is_void(&inv_paid));

    // 3. Already expired
    let inv_exp = symbol_short!("INV_E");
    client.mark_expired(&inv_exp);
    assert_eq!(
        client.try_void_invoice(&seller, &inv_exp),
        Err(Ok(Error::InvoiceExpired))
    );
    assert!(!client.is_void(&inv_exp));
}

#[test]
fn non_owner_cannot_void_registered_invoice() {
    let (env, client) = setup();
    let owner = new_seller(&env);
    let attacker = new_seller(&env);
    let inv = symbol_short!("INV_OWN");

    client.register_invoice(&owner, &inv);
    assert_eq!(
        client.try_register_invoice(&owner, &inv),
        Err(Ok(Error::AlreadyRegistered))
    );
    assert_eq!(
        client.try_void_invoice(&attacker, &inv),
        Err(Ok(Error::UnauthorizedSeller))
    );
    assert!(!client.is_void(&inv));
    assert!(!Error::AlreadyVoid.message().is_empty());
    assert!(!Error::AlreadyPaid.message().is_empty());
    assert!(!Error::InvoiceExpired.message().is_empty());
    assert!(!Error::UnauthorizedSeller.message().is_empty());
    assert!(!Error::AlreadyRegistered.message().is_empty());
}
