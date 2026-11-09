//! Boundary tests for `invoice-template-registry`.

use super::{new_seller, setup};
use soroban_sdk::symbol_short;

#[test]
fn minimum_positive_amount_and_i128_max_are_accepted() {
    let (env, client) = setup();
    let seller = new_seller(&env);

    let min_id = symbol_short!("TPL_MIN");
    let max_id = symbol_short!("TPL_MAX");
    let memo = symbol_short!("MEMO");

    client.register_template(&seller, &min_id, &1, &memo);
    client.register_template(&seller, &max_id, &i128::MAX, &memo);

    assert_eq!(client.template_for(&seller, &min_id).unwrap().amount, 1);
    assert_eq!(
        client.template_for(&seller, &max_id).unwrap().amount,
        i128::MAX
    );
}
