mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn independent_sellers_do_not_share_cooldowns() {
    let (env, client) = setup();
    let s1 = Address::generate(&env);
    let s2 = Address::generate(&env);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    client.bind(&s1, &p1, &100);
    client.bind(&s2, &p2, &110);

    assert_eq!(client.binding_of(&s1).unwrap().bound_at_ledger, 100);
    assert_eq!(client.binding_of(&s2).unwrap().bound_at_ledger, 110);
}
