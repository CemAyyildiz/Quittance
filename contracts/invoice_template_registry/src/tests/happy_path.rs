//! Happy-path tests for `invoice-template-registry`.

use super::{new_seller, setup};
use crate::Template;
use soroban_sdk::symbol_short;

#[test]
fn register_and_fetch_template_returns_exact_fields() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let tpl_id = symbol_short!("PRO_PLAN");
    let memo = symbol_short!("SUB_PRO");

    assert_eq!(client.template_for(&seller, &tpl_id), None);
    client.register_template(&seller, &tpl_id, &49_000_000, &memo);

    assert_eq!(
        client.template_for(&seller, &tpl_id),
        Some(Template {
            seller: seller.clone(),
            template_id: tpl_id,
            amount: 49_000_000,
            memo,
        })
    );
}
