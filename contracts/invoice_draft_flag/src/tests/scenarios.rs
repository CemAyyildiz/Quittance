use super::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn different_invoices_track_draft_and_published_states_independently() {
    let (env, client, seller_a) = setup();
    let seller_b = Address::generate(&env);
    let inv_a = symbol_short!("INV_A");
    let inv_b = symbol_short!("INV_B");

    client.publish(&seller_a, &inv_a);
    assert!(!client.is_draft(&inv_a));
    assert!(client.is_draft(&inv_b));

    client.publish(&seller_b, &inv_b);
    assert_eq!(client.published_by(&inv_b), Some(seller_b));
}
