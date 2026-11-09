//! Edge and boundary tests for `seller-cooldown-after-dispute`.

use super::{new_seller, setup};
use crate::{can_create_at, remaining_ledgers};

#[test]
fn exact_unlock_boundary_last_blocked_vs_first_allowed_ledger() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &500);
    assert!(!client.can_create_invoice(&seller, &500, &1));
    assert!(client.can_create_invoice(&seller, &501, &1));
}

#[test]
fn zero_cooldown_always_allows_invoice_creation() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &500);
    assert!(client.can_create_invoice(&seller, &500, &0));
    assert!(client.can_create_invoice(&seller, &0, &0));
    assert_eq!(client.remaining_cooldown(&seller, &500, &0), 0);
}

#[test]
fn dispute_at_ledger_zero_handles_boundaries_cleanly() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &0);
    assert!(!client.can_create_invoice(&seller, &0, &10));
    assert!(!client.can_create_invoice(&seller, &9, &10));
    assert!(client.can_create_invoice(&seller, &10, &10));
}

#[test]
fn u32_max_overflow_in_cooldown_keeps_seller_blocked_safely() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &(u32::MAX - 10));
    assert!(!client.can_create_invoice(&seller, &u32::MAX, &20));
    assert!(!can_create_at(Some(u32::MAX - 5), u32::MAX, 100));
    assert!(remaining_ledgers(Some(u32::MAX - 5), u32::MAX, 100) >= 1);
}
