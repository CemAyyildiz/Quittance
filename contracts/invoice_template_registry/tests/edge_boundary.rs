mod common;

use common::setup;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn isolates_templates_by_seller_and_supports_upsert_and_remove() {
    let (env, client) = setup();
    let s1 = Address::generate(&env);
    let s2 = Address::generate(&env);
    let tid = symbol_short!("STD");

    client.register_template(&s1, &tid, &100, &symbol_short!("M1"));
    client.register_template(&s2, &tid, &200, &symbol_short!("M2"));

    assert_eq!(client.template_for(&s1, &tid).unwrap().amount, 100);
    assert_eq!(client.template_for(&s2, &tid).unwrap().amount, 200);

    client.upsert_template(&s1, &tid, &150, &symbol_short!("M1B"));
    assert_eq!(client.template_for(&s1, &tid).unwrap().amount, 150);

    client.remove_template(&s1, &tid);
    assert_eq!(client.template_for(&s1, &tid), None);
}
