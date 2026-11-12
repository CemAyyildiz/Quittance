mod common;

use refund_cap_per_invoice::{checked_next_refund_total, RefundCapError};
use soroban_sdk::symbol_short;

#[test]
fn exact_full_refund_in_one_call_succeeds() {
    let (_env, client) = common::setup();
    let inv = symbol_short!("INV_FULL");
    assert_eq!(client.record_refund(&inv, &1, &1), 1);
    assert_eq!(client.refunded_so_far(&inv), 1);
    assert_eq!(client.remaining_refundable(&inv, &1), 0);
}

#[test]
fn i128_max_boundary_and_overflow_guard() {
    let (_env, client) = common::setup();
    let inv = symbol_short!("INV_MAX");
    assert_eq!(
        client.record_refund(&inv, &i128::MAX, &(i128::MAX - 1)),
        i128::MAX - 1
    );
    assert_eq!(client.remaining_refundable(&inv, &i128::MAX), 1);
    assert_eq!(client.record_refund(&inv, &i128::MAX, &1), i128::MAX);
    assert_eq!(
        client.try_record_refund(&inv, &i128::MAX, &1),
        Err(Ok(RefundCapError::ArithmeticOverflow))
    );
    assert_eq!(
        checked_next_refund_total(i128::MAX - 5, i128::MAX, 10),
        Err(RefundCapError::ArithmeticOverflow)
    );
}
