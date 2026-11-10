mod common;

use common::setup;
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    Address,
};

#[test]
fn records_exact_ledger_sequence_on_void() {
    let (env, client) = setup();
    env.ledger().with_mut(|l| l.sequence_number = 888);

    let seller = Address::generate(&env);
    let inv = symbol_short!("INV2");
    client.void_invoice(&seller, &inv);

    let rec = client.void_record(&inv).unwrap();
    assert_eq!(rec.voided_at_ledger, 888);
}
