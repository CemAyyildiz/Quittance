//! Multi-invoice lifecycle scenarios for `invoice-cancellation-window`.

use super::{new_payer, setup};
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn cancelled_invoice_cannot_be_marked_paid_and_other_invoices_remain_independent() {
    let (env, client) = setup();
    let payer = new_payer(&env);
    let inv_a = symbol_short!("INV_A");
    let inv_b = symbol_short!("INV_B");

    client.cancel(&payer, &inv_a, &200, &210, &25);
    assert_eq!(client.try_mark_paid(&inv_a), Err(Ok(Error::AlreadyCancelled)));

    assert!(!client.is_cancelled(&inv_b));
    client.mark_paid(&inv_b);
    assert_eq!(
        client.try_cancel(&payer, &inv_b, &200, &210, &25),
        Err(Ok(Error::AlreadyPaid))
    );
}
