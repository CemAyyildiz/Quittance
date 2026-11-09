//! Multi-seller namespace isolation and lifecycle scenarios for `invoice-template-registry`.

use super::{new_seller, setup};
use soroban_sdk::symbol_short;

#[test]
fn two_sellers_can_use_same_template_id_independently_and_update_or_remove() {
    let (env, client) = setup();
    let seller_a = new_seller(&env);
    let seller_b = new_seller(&env);
    let tpl_id = symbol_short!("MONTHLY");

    client.register_template(&seller_a, &tpl_id, &10_000, &symbol_short!("A_MEMO"));
    client.register_template(&seller_b, &tpl_id, &99_000, &symbol_short!("B_MEMO"));

    assert_eq!(client.template_for(&seller_a, &tpl_id).unwrap().amount, 10_000);
    assert_eq!(client.template_for(&seller_b, &tpl_id).unwrap().amount, 99_000);

    client.update_template(&seller_a, &tpl_id, &15_000, &symbol_short!("A_V2"));
    assert_eq!(client.template_for(&seller_a, &tpl_id).unwrap().amount, 15_000);
    assert_eq!(client.template_for(&seller_b, &tpl_id).unwrap().amount, 99_000);

    client.remove_template(&seller_a, &tpl_id);
    assert_eq!(client.template_for(&seller_a, &tpl_id), None);
    assert_eq!(client.template_for(&seller_b, &tpl_id).unwrap().amount, 99_000);
}
