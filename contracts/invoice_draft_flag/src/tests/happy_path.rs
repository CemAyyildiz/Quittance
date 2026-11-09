use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn starts_as_draft_and_transitions_to_published_once() {
    let (_env, client, seller) = setup();
    let inv = symbol_short!("INV_1");

    assert!(client.is_draft(&inv));
    assert!(!client.is_published(&inv));

    client.publish(&seller, &inv);
    assert!(!client.is_draft(&inv));
    assert!(client.is_published(&inv));
    assert_eq!(client.published_by(&inv), Some(seller));
}
