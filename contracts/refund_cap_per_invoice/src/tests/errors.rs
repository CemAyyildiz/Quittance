use super::setup;
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn rejects_non_positive_amounts_mismatch_and_cap_overflow() {
    let (_env, client) = setup();
    let inv = symbol_short!("INV_ERR");

    assert_eq!(
        client.try_record_refund(&inv, &0, &10),
        Err(Ok(Error::InvalidOriginalAmount))
    );
    assert_eq!(
        client.try_record_refund(&inv, &100, &0),
        Err(Ok(Error::InvalidRefundAmount))
    );
    client.record_refund(&inv, &100, &60);
    assert_eq!(
        client.try_record_refund(&inv, &200, &10),
        Err(Ok(Error::OriginalAmountMismatch))
    );
    assert_eq!(
        client.try_record_refund(&inv, &100, &41),
        Err(Ok(Error::RefundCapExceeded))
    );
}
