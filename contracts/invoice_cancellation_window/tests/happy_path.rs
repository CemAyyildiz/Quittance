mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn payer_cancels_invoice_within_window() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let inv = symbol_short!("INV10");

    assert!(client.can_cancel_at(&inv, &100, &120, &50));
    let rec = client.cancel(&payer, &inv, &100, &120, &50);
    assert_eq!(rec.invoice_id, inv);
    assert_eq!(rec.cancelled_at_ledger, 120);
    assert!(client.is_cancelled(&inv));
}
