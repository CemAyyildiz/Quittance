//! Edge and boundary tests for `invoice-category-registry`.
//!
//! These push the identifiers a `Symbol` can carry to their limits and pin what
//! re-tagging an invoice does.

mod common;

use common::{category, invoice, setup};

#[test]
fn a_single_character_category_works() {
    let (env, admin, client) = setup();
    let short = category(&env, "a");
    let inv = invoice(&env, "inv_1");

    client.register_category(&admin, &short);
    client.set_invoice_category(&inv, &short);

    assert!(client.is_registered(&short));
    assert_eq!(client.category_of(&inv), Some(short));
}

#[test]
fn the_longest_supported_category_and_invoice_ids_work() {
    let (env, admin, client) = setup();
    // Exactly 32 characters, the maximum length of a Soroban `Symbol`.
    let longest_category = "classification_0123456789abcdefg";
    let longest_invoice = "invoice_0123456789abcdefghijklmn";
    assert_eq!(longest_category.len(), 32);
    assert_eq!(longest_invoice.len(), 32);

    let cat = category(&env, longest_category);
    let inv = invoice(&env, longest_invoice);

    client.register_category(&admin, &cat);
    client.set_invoice_category(&inv, &cat);

    assert_eq!(client.category_of(&inv), Some(cat));
}

#[test]
fn an_untagged_invoice_has_no_category() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");

    client.register_category(&admin, &travel);

    assert_eq!(client.category_of(&invoice(&env, "inv_untagged")), None);
}

#[test]
fn re_tagging_an_invoice_replaces_the_previous_category() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let software = category(&env, "software");
    let inv = invoice(&env, "inv_retag");

    client.register_category(&admin, &travel);
    client.register_category(&admin, &software);
    client.set_invoice_category(&inv, &travel);
    client.set_invoice_category(&inv, &software);

    assert_eq!(client.category_of(&inv), Some(software));
}

#[test]
fn tagging_the_same_category_twice_keeps_one_tag() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let inv = invoice(&env, "inv_same");

    client.register_category(&admin, &travel);
    client.set_invoice_category(&inv, &travel);
    client.set_invoice_category(&inv, &travel);

    assert_eq!(client.category_of(&inv), Some(travel));
}

#[test]
fn categories_differing_only_by_case_are_distinct() {
    let (env, admin, client) = setup();
    let lower = category(&env, "travel");
    let upper = category(&env, "Travel");

    client.register_category(&admin, &lower);
    client.register_category(&admin, &upper);

    assert_eq!(client.categories().len(), 2);
    assert!(client.is_registered(&lower));
    assert!(client.is_registered(&upper));
}
