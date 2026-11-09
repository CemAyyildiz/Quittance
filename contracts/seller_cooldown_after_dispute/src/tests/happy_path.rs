//! Happy-path tests for `seller-cooldown-after-dispute`.

use super::{new_seller, setup};
use crate::CooldownStatus;

#[test]
fn seller_without_dispute_can_always_create_invoice() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    assert!(client.can_create_invoice(&seller, &0, &100));
    assert!(client.can_create_invoice(&seller, &500, &100));
    assert_eq!(client.last_dispute_ledger(&seller), None);
    assert_eq!(client.remaining_cooldown(&seller, &500, &100), 0);
}

#[test]
fn flagged_seller_is_blocked_during_cooldown_and_auto_unlocks_after() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &1_000);
    assert_eq!(client.last_dispute_ledger(&seller), Some(1_000));

    assert!(!client.can_create_invoice(&seller, &1_000, &50));
    assert!(!client.can_create_invoice(&seller, &1_025, &50));
    assert!(!client.can_create_invoice(&seller, &1_049, &50));

    assert!(client.can_create_invoice(&seller, &1_050, &50));
    assert!(client.can_create_invoice(&seller, &2_000, &50));
}

#[test]
fn remaining_cooldown_and_status_track_progress_accurately() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &200);
    assert_eq!(client.remaining_cooldown(&seller, &200, &30), 30);
    assert_eq!(client.remaining_cooldown(&seller, &210, &30), 20);
    assert_eq!(client.remaining_cooldown(&seller, &229, &30), 1);
    assert_eq!(client.remaining_cooldown(&seller, &230, &30), 0);

    assert_eq!(
        client.status(&seller, &210, &30),
        CooldownStatus {
            can_create: false,
            remaining_ledgers: 20,
        }
    );
    assert_eq!(
        client.status(&seller, &230, &30),
        CooldownStatus {
            can_create: true,
            remaining_ledgers: 0,
        }
    );
}
