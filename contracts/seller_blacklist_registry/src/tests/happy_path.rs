//! Happy-path tests for `seller-blacklist-registry`.

use super::{new_addr, setup};

#[test]
fn unknown_seller_is_allowed_then_blocked_when_blacklisted_and_restored_when_unblacklisted() {
    let (env, client) = setup();
    let seller = new_addr(&env);

    assert!(client.is_allowed(&seller));
    assert!(!client.is_blacklisted(&seller));

    client.blacklist(&seller);
    assert!(!client.is_allowed(&seller));
    assert!(client.is_blacklisted(&seller));

    client.unblacklist(&seller);
    assert!(client.is_allowed(&seller));
    assert!(!client.is_blacklisted(&seller));
}
