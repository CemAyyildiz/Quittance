use super::{client, sym};

use soroban_sdk::Env;

#[test]
fn stores_unique_tags_in_order() {
    let env = Env::default();
    let api = client(&env);
    let invoice = sym(&env, "inv_1");
    let paid = sym(&env, "paid");
    let retail = sym(&env, "retail");

    assert!(api.add_tag(&invoice, &paid));
    assert!(api.add_tag(&invoice, &retail));

    let tags = api.tags_of(&invoice);
    assert_eq!(tags.len(), 2);
    assert_eq!(tags.get(0), Some(paid));
    assert_eq!(tags.get(1), Some(retail));
}
