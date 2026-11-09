//! Failure and rejection case tests for `seller-cooldown-after-dispute`.

use super::{new_seller, setup};
use crate::{unlock_ledger, CooldownError};

#[test]
fn querying_at_ledger_before_dispute_ledger_is_rejected() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &1_000);
    assert!(!client.can_create_invoice(&seller, &999, &10));
    assert!(!client.can_create_invoice(&seller, &0, &10));
}

#[test]
fn flag_dispute_checked_rejects_earlier_ledger_regression() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    assert_eq!(client.flag_dispute_checked(&seller, &500), 500);
    let err = client.try_flag_dispute_checked(&seller, &499);
    assert_eq!(err, Err(Ok(CooldownError::LedgerRegression)));
    assert_eq!(client.last_dispute_ledger(&seller), Some(500));
}

#[test]
fn monotonic_flag_dispute_ignores_out_of_order_older_ledger() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &500);
    client.flag_dispute(&seller, &300);
    assert_eq!(client.last_dispute_ledger(&seller), Some(500));
    assert!(!client.can_create_invoice(&seller, &540, &50));
}

#[test]
fn unlock_ledger_reports_overflow_and_error_messages_are_stable() {
    assert_eq!(
        unlock_ledger(u32::MAX, 1),
        Err(CooldownError::UnlockOverflow)
    );
    assert!(!CooldownError::LedgerRegression.message().is_empty());
    assert!(!CooldownError::UnlockOverflow.message().is_empty());
}
