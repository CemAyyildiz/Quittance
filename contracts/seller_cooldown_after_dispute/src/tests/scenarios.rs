//! Multi-seller and repeated-dispute scenarios for `seller-cooldown-after-dispute`.

use super::{new_seller, setup};

#[test]
fn multiple_sellers_have_isolated_cooldown_windows() {
    let (env, client) = setup();
    let seller_a = new_seller(&env);
    let seller_b = new_seller(&env);
    let seller_c = new_seller(&env);

    client.flag_dispute(&seller_a, &100);
    client.flag_dispute(&seller_b, &130);

    assert!(client.can_create_invoice(&seller_a, &150, &40));
    assert!(!client.can_create_invoice(&seller_b, &150, &40));
    assert!(client.can_create_invoice(&seller_c, &150, &40));
}

#[test]
fn repeat_dispute_resets_and_extends_cooldown_window() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    client.flag_dispute(&seller, &100);
    assert!(!client.can_create_invoice(&seller, &120, &50));

    client.flag_dispute(&seller, &130);
    assert!(!client.can_create_invoice(&seller, &150, &50));
    assert!(!client.can_create_invoice(&seller, &179, &50));
    assert!(client.can_create_invoice(&seller, &180, &50));

    client.flag_dispute(&seller, &300);
    assert!(!client.can_create_invoice(&seller, &320, &50));
    assert!(client.can_create_invoice(&seller, &350, &50));
}
