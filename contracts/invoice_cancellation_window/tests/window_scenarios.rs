mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn stores_full_cancellation_record_per_invoice() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let inv = symbol_short!("INV40");

    assert_eq!(client.cancellation_record(&inv), None);
    client.cancel(&payer, &inv, &500, &505, &10);
    let rec = client.cancellation_record(&inv).unwrap();
    assert_eq!(rec.payer, payer);
    assert_eq!(rec.cancelled_at_ledger, 505);
}
