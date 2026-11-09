//! Happy-path tests for `invoice-void-flag`.

use super::{new_seller, setup};
use crate::InvoiceState;
use soroban_sdk::symbol_short;

#[test]
fn seller_can_void_unpaid_invoice_once_and_is_void_flips_to_true() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let inv = symbol_short!("INV_1");

    assert!(!client.is_void(&inv));
    assert_eq!(client.state_of(&inv), InvoiceState::Open);

    client.void_invoice(&seller, &inv);
    assert!(client.is_void(&inv));
    assert_eq!(client.state_of(&inv), InvoiceState::Void);
}
