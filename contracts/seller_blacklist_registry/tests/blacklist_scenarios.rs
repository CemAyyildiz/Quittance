mod common;

use common::setup;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn tracks_multiple_sellers_independently() {
    let (env, client) = setup();
    let s1 = Address::generate(&env);
    let s2 = Address::generate(&env);
    let s3 = Address::generate(&env);

    client.blacklist(&s1);
    client.blacklist(&s2);

    assert!(!client.is_allowed(&s1));
    assert!(!client.is_allowed(&s2));
    assert!(client.is_allowed(&s3));
    assert_eq!(client.blacklisted_count(), 2);
}
