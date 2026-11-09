use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn tracks_refund_caps_independently_across_invoices() {
    let (_env, client) = setup();
    let inv_a = symbol_short!("INV_A");
    let inv_b = symbol_short!("INV_B");

    client.record_refund(&inv_a, &1_000, &900);
    client.record_refund(&inv_b, &5_000, &1_200);

    assert_eq!(client.refunded_so_far(&inv_a), 900);
    assert_eq!(client.refunded_so_far(&inv_b), 1_200);
}
