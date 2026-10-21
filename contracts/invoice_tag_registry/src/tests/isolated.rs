use super::{client, sym};

use soroban_sdk::Env;

#[test]
fn invoices_keep_separate_tag_lists() {
    let env = Env::default();
    let api = client(&env);
    let first = sym(&env, "inv_a");
    let second = sym(&env, "inv_b");

    assert!(api.add_tag(&first, &sym(&env, "alpha")));
    assert!(api.add_tag(&second, &sym(&env, "beta")));

    assert_eq!(api.tags_of(&first).get(0), Some(sym(&env, "alpha")));
    assert_eq!(api.tags_of(&second).get(0), Some(sym(&env, "beta")));
    assert_eq!(api.tags_of(&first).len(), 1);
}
