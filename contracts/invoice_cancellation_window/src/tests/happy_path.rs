//! Happy-path tests for `invoice-cancellation-window`.

use super::{new_payer, setup};
use crate::CancellationRecord;
use soroban_sdk::symbol_short;

#[test]
fn payer_can_cancel_unpaid_invoice_within_window() {
    let (env, client) = setup();
    let payer = new_payer(&env);
    let inv = symbol_short!("INV_100");

    assert!(!client.is_cancelled(&inv));
    client.cancel(&payer, &inv, &1_000, &1_015, &30);
    assert!(client.is_cancelled(&inv));
    assert_eq!(
        client.record_of(&inv),
        Some(CancellationRecord {
            payer,
            created_at: 1_000,
            cancelled_at: 1_015,
        })
    );
}
