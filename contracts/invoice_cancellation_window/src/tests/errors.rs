//! Error and rejection tests for `invoice-cancellation-window`.

use super::{new_payer, setup};
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn cancellation_one_ledger_after_window_closes_is_rejected() {
    let (env, client) = setup();
    let payer = new_payer(&env);
    let inv = symbol_short!("INV_LATE");

    assert_eq!(
        client.try_cancel(&payer, &inv, &1_000, &1_031, &30),
        Err(Ok(Error::WindowClosed))
    );
    assert!(!client.is_cancelled(&inv));
}

#[test]
fn current_ledger_before_created_at_is_rejected() {
    let (env, client) = setup();
    let payer = new_payer(&env);
    let inv = symbol_short!("INV_PRE");

    assert_eq!(
        client.try_cancel(&payer, &inv, &1_000, &999, &30),
        Err(Ok(Error::InvalidLedgerOrder))
    );
}

#[test]
fn duplicate_cancel_and_cancelling_paid_invoice_are_rejected() {
    let (env, client) = setup();
    let payer = new_payer(&env);
    let inv_dup = symbol_short!("INV_DUP");

    client.cancel(&payer, &inv_dup, &100, &105, &20);
    assert_eq!(
        client.try_cancel(&payer, &inv_dup, &100, &106, &20),
        Err(Ok(Error::AlreadyCancelled))
    );

    let inv_paid = symbol_short!("INV_PAID");
    client.mark_paid(&inv_paid);
    assert_eq!(
        client.try_cancel(&payer, &inv_paid, &100, &105, &20),
        Err(Ok(Error::AlreadyPaid))
    );
    assert!(!Error::WindowClosed.message().is_empty());
    assert!(!Error::InvalidLedgerOrder.message().is_empty());
    assert!(!Error::AlreadyCancelled.message().is_empty());
    assert!(!Error::AlreadyPaid.message().is_empty());
}
