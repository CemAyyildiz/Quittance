mod common;

use common::setup;
use invoice_void_flag::VoidFlagError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn voided_invoice_cannot_subsequently_be_marked_paid() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let inv = symbol_short!("INV99");

    client.void_invoice(&seller, &inv);
    assert_eq!(
        client.try_mark_paid(&inv),
        Err(Ok(VoidFlagError::AlreadyVoid))
    );
}
