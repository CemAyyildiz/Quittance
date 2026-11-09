//! Multi-action concurrent workflow scenarios for `multi-sig-approval-counter`.

use super::{new_signer, setup};
use soroban_sdk::symbol_short;

#[test]
fn independent_action_ids_track_approvals_separately() {
    let (env, client) = setup();
    let refund_action = symbol_short!("REFUND_1");
    let upgrade_action = symbol_short!("UPGRADE1");

    let alice = new_signer(&env);
    let bob = new_signer(&env);
    let carol = new_signer(&env);

    assert!(!client.approve(&refund_action, &alice, &2));
    assert!(!client.approve(&upgrade_action, &alice, &3));

    assert!(client.approve(&refund_action, &bob, &2));
    assert!(!client.approve(&upgrade_action, &bob, &3));

    assert!(client.is_approved(&refund_action));
    assert!(!client.is_approved(&upgrade_action));

    assert!(client.approve(&upgrade_action, &carol, &3));
    assert!(client.is_approved(&upgrade_action));
}
