mod common;

use soroban_sdk::symbol_short;

#[test]
fn independent_invoices_track_separate_caps() {
    let (_env, client) = common::setup();
    let a = symbol_short!("INVA");
    let b = symbol_short!("INVB");
    client.record_refund(&a, &1000, &750);
    client.record_refund(&b, &500, &500);
    assert_eq!(client.refunded_so_far(&a), 750);
    assert_eq!(client.refunded_so_far(&b), 500);
}
