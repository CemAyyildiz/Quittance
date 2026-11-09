//! Multi-invoice lifecycle scenarios for `invoice-void-flag`.

use super::{new_seller, setup};
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn voided_invoice_cannot_later_be_marked_paid_or_expired() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let inv = symbol_short!("INV_LC");

    client.void_invoice(&seller, &inv);
    assert_eq!(client.try_mark_paid(&inv), Err(Ok(Error::AlreadyVoid)));
    assert_eq!(client.try_mark_expired(&inv), Err(Ok(Error::AlreadyVoid)));
    assert!(client.is_void(&inv));
}
