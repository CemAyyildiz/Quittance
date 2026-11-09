//! Boundary and idempotency tests for `seller-blacklist-registry`.

use super::{new_addr, setup};

#[test]
fn repeated_blacklist_and_unblacklist_calls_are_idempotent() {
    let (env, client) = setup();
    let seller = new_addr(&env);

    // Unblacklisting a never-blacklisted seller is a safe no-op
    client.unblacklist(&seller);
    assert!(client.is_allowed(&seller));

    // Repeated blacklisting stays blacklisted
    client.blacklist(&seller);
    client.blacklist(&seller);
    assert!(!client.is_allowed(&seller));

    // Repeated unblacklisting stays allowed
    client.unblacklist(&seller);
    client.unblacklist(&seller);
    assert!(client.is_allowed(&seller));
}
