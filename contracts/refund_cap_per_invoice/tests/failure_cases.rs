mod common;

use refund_cap_per_invoice::RefundCapError;
use soroban_sdk::symbol_short;

#[test]
fn refund_exceeding_cap_is_rejected() {
    let (_env, client) = common::setup();
    let inv = symbol_short!("INV1");
    client.record_refund(&inv, &500, &300);
    let res = client.try_record_refund(&inv, &500, &201);
    assert_eq!(res, Err(Ok(RefundCapError::RefundExceedsOriginalAmount)));
    assert_eq!(client.refunded_so_far(&inv), 300);
}

#[test]
fn non_positive_amounts_and_mismatched_original_rejected() {
    let (_env, client) = common::setup();
    let inv = symbol_short!("INV2");
    assert_eq!(
        client.try_record_refund(&inv, &0, &10),
        Err(Ok(RefundCapError::InvalidOriginalAmount))
    );
    assert_eq!(
        client.try_record_refund(&inv, &-50, &10),
        Err(Ok(RefundCapError::InvalidOriginalAmount))
    );
    assert_eq!(
        client.try_record_refund(&inv, &100, &0),
        Err(Ok(RefundCapError::InvalidRefundAmount))
    );
    assert_eq!(
        client.try_record_refund(&inv, &100, &-5),
        Err(Ok(RefundCapError::InvalidRefundAmount))
    );
    client.record_refund(&inv, &100, &40);
    assert_eq!(
        client.try_record_refund(&inv, &200, &20),
        Err(Ok(RefundCapError::OriginalAmountMismatch))
    );
    assert_eq!(
        client.try_remaining_refundable(&inv, &200),
        Err(Ok(RefundCapError::OriginalAmountMismatch))
    );
}
