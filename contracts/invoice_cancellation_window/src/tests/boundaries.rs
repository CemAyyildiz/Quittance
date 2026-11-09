//! Boundary tests for `invoice-cancellation-window`.

use super::{new_payer, setup};
use crate::{remaining_window, Error};
use soroban_sdk::symbol_short;

#[test]
fn cancel_at_exact_creation_ledger_and_exact_closing_ledger_succeeds() {
    let (env, client) = setup();
    let payer = new_payer(&env);

    let inv_start = symbol_short!("INV_ST");
    client.cancel(&payer, &inv_start, &500, &500, &20);
    assert!(client.is_cancelled(&inv_start));

    let inv_end = symbol_short!("INV_END");
    client.cancel(&payer, &inv_end, &500, &520, &20);
    assert!(client.is_cancelled(&inv_end));
}

#[test]
fn zero_window_allows_same_ledger_only_and_handles_u32_max() {
    let (env, client) = setup();
    let payer = new_payer(&env);

    let inv_zero = symbol_short!("INV_Z0");
    client.cancel(&payer, &inv_zero, &100, &100, &0);
    assert!(client.is_cancelled(&inv_zero));

    let inv_zero_late = symbol_short!("INV_Z1");
    assert_eq!(
        client.try_cancel(&payer, &inv_zero_late, &100, &101, &0),
        Err(Ok(Error::WindowClosed))
    );

    let inv_max = symbol_short!("INV_MAX");
    client.cancel(&payer, &inv_max, &(u32::MAX - 5), &u32::MAX, &100);
    assert!(client.is_cancelled(&inv_max));
    assert_eq!(remaining_window(100, 105, 20), Some(15));
    assert_eq!(remaining_window(100, 125, 20), None);
}
