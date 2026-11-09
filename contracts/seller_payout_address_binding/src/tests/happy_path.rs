//! Happy-path tests for `seller-payout-address-binding`.

use super::{new_addr, setup};
use crate::{PayoutBinding, DEFAULT_REBIND_COOLDOWN_LEDGERS};

#[test]
fn initial_bind_and_rebind_after_cooldown_succeed() {
    let (env, client) = setup();
    let seller = new_addr(&env);
    let dest_1 = new_addr(&env);
    let dest_2 = new_addr(&env);

    assert_eq!(client.payout_address_of(&seller), None);
    assert_eq!(client.cooldown(), DEFAULT_REBIND_COOLDOWN_LEDGERS);

    client.bind(&seller, &dest_1, &1_000);
    assert_eq!(client.payout_address_of(&seller), Some(dest_1.clone()));
    assert_eq!(
        client.binding_of(&seller),
        Some(PayoutBinding {
            payout_address: dest_1,
            bound_at_ledger: 1_000,
        })
    );

    // Rebind after 100 ledgers (at ledger 1100) succeeds
    client.bind(&seller, &dest_2, &1_100);
    assert_eq!(client.payout_address_of(&seller), Some(dest_2));
}
