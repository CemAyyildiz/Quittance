use super::{client, sym};

use soroban_sdk::Env;

#[test]
fn duplicate_tag_is_rejected() {
    let env = Env::default();
    let api = client(&env);
    let invoice = sym(&env, "inv_dup");
    let paid = sym(&env, "paid");

    assert!(api.add_tag(&invoice, &paid));
    assert!(!api.add_tag(&invoice, &paid));
    assert_eq!(api.tags_of(&invoice).len(), 1);
}

#[test]
fn tag_past_the_cap_is_rejected() {
    let env = Env::default();
    let api = client(&env);
    let invoice = sym(&env, "inv_full");
    for name in ["a", "b", "c", "d"] {
        assert!(api.add_tag(&invoice, &sym(&env, name)));
    }
    assert!(!api.add_tag(&invoice, &sym(&env, "e")));
    assert_eq!(api.tags_of(&invoice).len(), 4);
}
