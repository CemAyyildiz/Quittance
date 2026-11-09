use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn multiple_partial_refunds_accumulate_within_cap() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_100");

    assert_eq!(client.refunded_so_far(&inv), 0);
    assert_eq!(client.record_refund(&inv, &1_000, &300), 300);
    assert_eq!(client.record_refund(&inv, &1_000, &450), 750);
    assert_eq!(client.refunded_so_far(&inv), 750);
    assert_eq!(client.remaining_refundable(&inv, &1_000), 250);
}
