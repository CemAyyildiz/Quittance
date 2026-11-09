//! Multi-seller and sequential rotation scenarios for `seller-payout-address-binding`.

use super::{new_addr, setup};

#[test]
fn sequential_rotations_each_enforce_fresh_cooldown_and_sellers_are_isolated() {
    let (env, client) = setup();
    let seller_a = new_addr(&env);
    let seller_b = new_addr(&env);
    let a1 = new_addr(&env);
    let a2 = new_addr(&env);
    let a3 = new_addr(&env);
    let b1 = new_addr(&env);

    client.bind(&seller_a, &a1, &100);
    client.bind(&seller_b, &b1, &120);

    // Rotate seller_a at 200 -> next rotation requires ledger >= 300
    client.bind(&seller_a, &a2, &200);
    assert!(client.try_bind(&seller_a, &a3, &299).is_err());
    client.bind(&seller_a, &a3, &300);

    assert_eq!(client.payout_address_of(&seller_a), Some(a3));
    assert_eq!(client.payout_address_of(&seller_b), Some(b1));
}
