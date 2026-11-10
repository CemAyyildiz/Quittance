mod common;

use common::setup;
use seller_payout_address_binding::PayoutBindingError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn enforces_exact_rebind_cooldown_boundary() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    client.set_cooldown_ledgers(&50);
    client.bind(&seller, &p1, &200);

    assert_eq!(
        client.try_bind(&seller, &p2, &249),
        Err(Ok(PayoutBindingError::RebindCooldownActive))
    );
    client.bind(&seller, &p2, &250);
    assert_eq!(client.payout_address_of(&seller), Some(p2));
}
