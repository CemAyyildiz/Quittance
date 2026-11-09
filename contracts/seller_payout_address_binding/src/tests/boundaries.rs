//! Boundary tests for `seller-payout-address-binding`.

use super::{new_addr, setup};
use crate::Error;

#[test]
fn exact_cooldown_boundary_last_blocked_vs_first_allowed_ledger() {
    let (env, client) = setup();
    let seller = new_addr(&env);
    let dest_1 = new_addr(&env);
    let dest_2 = new_addr(&env);

    client.set_cooldown(&50);
    client.bind(&seller, &dest_1, &200);

    assert_eq!(
        client.try_bind(&seller, &dest_2, &249),
        Err(Ok(Error::CooldownActive))
    );
    assert_eq!(client.payout_address_of(&seller), Some(dest_1));

    client.bind(&seller, &dest_2, &250);
    assert_eq!(client.payout_address_of(&seller), Some(dest_2));
}

#[test]
fn zero_cooldown_allows_immediate_rebind_on_same_ledger() {
    let (env, client) = setup();
    let seller = new_addr(&env);
    let dest_1 = new_addr(&env);
    let dest_2 = new_addr(&env);

    client.set_cooldown(&0);
    client.bind(&seller, &dest_1, &500);
    client.bind(&seller, &dest_2, &500);
    assert_eq!(client.payout_address_of(&seller), Some(dest_2));
}
