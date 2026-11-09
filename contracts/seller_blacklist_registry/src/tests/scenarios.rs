//! Multi-seller isolation and toggle scenarios for `seller-blacklist-registry`.

use super::{new_addr, setup};

#[test]
fn blacklisting_one_seller_leaves_other_sellers_allowed() {
    let (env, client) = setup();
    let s1 = new_addr(&env);
    let s2 = new_addr(&env);
    let s3 = new_addr(&env);

    client.blacklist(&s1);
    client.blacklist(&s2);

    assert!(!client.is_allowed(&s1));
    assert!(!client.is_allowed(&s2));
    assert!(client.is_allowed(&s3));

    client.unblacklist(&s1);
    assert!(client.is_allowed(&s1));
    assert!(!client.is_allowed(&s2));
}
