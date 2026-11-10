mod common;

use common::setup;
use invoice_void_flag::VoidFlagError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn rejects_double_void_paid_invoice_and_wrong_seller() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let other = Address::generate(&env);
    let inv_a = symbol_short!("INVA");
    let inv_b = symbol_short!("INVB");

    client.register_invoice(&seller, &inv_a);
    assert_eq!(
        client.try_void_invoice(&other, &inv_a),
        Err(Ok(VoidFlagError::UnauthorizedSeller))
    );

    client.void_invoice(&seller, &inv_a);
    assert_eq!(
        client.try_void_invoice(&seller, &inv_a),
        Err(Ok(VoidFlagError::AlreadyVoid))
    );

    client.mark_paid(&inv_b);
    assert_eq!(
        client.try_void_invoice(&seller, &inv_b),
        Err(Ok(VoidFlagError::AlreadyPaid))
    );
}
