//! Happy-path tests for `invoice-category-registry`.
//!
//! These cover the successful path: the admin curates categories and invoices
//! are tagged with them.

mod common;

use common::{category, invoice, setup};
use invoice_category_registry::MAX_CATEGORIES;

#[test]
fn the_registry_starts_empty() {
    let (env, _admin, client) = setup();
    let travel = category(&env, "travel");

    assert_eq!(client.categories().len(), 0);
    assert!(!client.is_registered(&travel));
    assert_eq!(client.category_of(&invoice(&env, "inv_1")), None);
}

#[test]
fn the_admin_registers_a_category() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");

    client.register_category(&admin, &travel);

    assert!(client.is_registered(&travel));
    assert_eq!(client.categories().len(), 1);
    assert_eq!(client.categories().get(0), Some(travel));
}

#[test]
fn a_seller_tags_an_invoice_with_a_registered_category() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let inv = invoice(&env, "inv_1");

    client.register_category(&admin, &travel);
    client.set_invoice_category(&inv, &travel);

    assert_eq!(client.category_of(&inv), Some(travel));
}

#[test]
fn categories_keep_their_registration_order() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let software = category(&env, "software");
    let consulting = category(&env, "consulting");

    client.register_category(&admin, &travel);
    client.register_category(&admin, &software);
    client.register_category(&admin, &consulting);

    let listed = client.categories();
    assert_eq!(listed.len(), 3);
    assert_eq!(listed.get(0), Some(travel));
    assert_eq!(listed.get(1), Some(software));
    assert_eq!(listed.get(2), Some(consulting));
}

#[test]
fn registering_the_same_category_twice_is_a_no_op() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");

    client.register_category(&admin, &travel);
    client.register_category(&admin, &travel);

    assert_eq!(client.categories().len(), 1);
    assert!(client.is_registered(&travel));
}

#[test]
fn invoices_are_tagged_independently() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let software = category(&env, "software");
    let first = invoice(&env, "inv_1");
    let second = invoice(&env, "inv_2");

    client.register_category(&admin, &travel);
    client.register_category(&admin, &software);
    client.set_invoice_category(&first, &travel);
    client.set_invoice_category(&second, &software);

    assert_eq!(client.category_of(&first), Some(travel));
    assert_eq!(client.category_of(&second), Some(software));
}

#[test]
fn the_registry_can_hold_exactly_the_maximum() {
    let (env, admin, client) = setup();

    for index in 0..MAX_CATEGORIES {
        let name = format!("cat_{index}");
        client.register_category(&admin, &category(&env, &name));
    }

    assert_eq!(client.categories().len(), MAX_CATEGORIES);
}
