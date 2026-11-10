mod common;

use common::setup;
use invoice_cancellation_window::CancellationError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn rejects_expired_window_duplicate_cancel_and_invalid_ledger() {
    let (env, client) = setup();
    let payer = Address::generate(&env);
    let inv = symbol_short!("INV30");

    assert_eq!(
        client.try_cancel(&payer, &inv, &100, &90, &20),
        Err(Ok(CancellationError::InvalidLedgerOrder))
    );
    assert_eq!(
        client.try_cancel(&payer, &inv, &100, &121, &20),
        Err(Ok(CancellationError::WindowExpired))
    );

    client.cancel(&payer, &inv, &100, &110, &20);
    assert_eq!(
        client.try_cancel(&payer, &inv, &100, &112, &20),
        Err(Ok(CancellationError::AlreadyCancelled))
    );
}
