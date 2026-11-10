mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn allows_cancellation_on_exact_deadline_ledger() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let inv = symbol_short!("INV20");

    // created_at=100, window=25 -> deadline=125 inclusive
    assert!(client.can_cancel_at(&inv, &100, &125, &25));
    assert!(!client.can_cancel_at(&inv, &100, &126, &25));
    client.cancel(&payer, &inv, &100, &125, &25);
    assert!(client.is_cancelled(&inv));
}
