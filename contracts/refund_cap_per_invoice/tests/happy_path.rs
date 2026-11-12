mod common;

use soroban_sdk::symbol_short;

#[test]
fn single_and_partial_refunds_accumulate_properly() {
    let (_env, client) = common::setup();
    let inv = symbol_short!("INV1");
    assert_eq!(client.refunded_so_far(&inv), 0);
    assert_eq!(client.record_refund(&inv, &1000, &400), 400);
    assert_eq!(client.refunded_so_far(&inv), 400);
    assert_eq!(client.remaining_refundable(&inv, &1000), 600);
    assert_eq!(client.record_refund(&inv, &1000, &600), 1000);
    assert_eq!(client.remaining_refundable(&inv, &1000), 0);
}
