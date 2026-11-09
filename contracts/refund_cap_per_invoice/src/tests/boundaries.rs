use super::setup;
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn refunding_exact_original_amount_reaches_zero_remaining_and_blocks_more() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_EX");

    assert_eq!(client.record_refund(&inv, &500, &500), 500);
    assert_eq!(client.remaining_refundable(&inv, &500), 0);
    assert_eq!(
        client.try_record_refund(&inv, &500, &1),
        Err(Ok(Error::RefundCapExceeded))
    );
}
