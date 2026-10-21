use super::{client, sym};

use crate::MAX_TAGS;
use soroban_sdk::Env;

#[test]
fn fourth_tag_fills_the_cap() {
    let env = Env::default();
    let api = client(&env);
    let invoice = sym(&env, "inv_cap");
    let names = ["a", "b", "c", "d"];
    for name in names {
        assert!(api.add_tag(&invoice, &sym(&env, name)));
    }
    assert_eq!(api.tags_of(&invoice).len(), MAX_TAGS);
}

#[test]
fn unknown_invoice_has_no_tags() {
    let env = Env::default();
    let api = client(&env);
    assert_eq!(api.tags_of(&sym(&env, "missing")).len(), 0);
}
