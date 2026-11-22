//! Failure and error-case tests for `invoice-category-registry`.
//!
//! These cover every way the contract refuses a call: an unregistered
//! category, a full registry, a caller who is not the admin, and a call that is
//! not authorized. A refused call must never change the stored state.

mod common;

use common::{category, invoice, setup};
use invoice_category_registry::{
    Error, InvoiceCategoryRegistry, InvoiceCategoryRegistryClient, MAX_CATEGORIES,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn tagging_with_an_unregistered_category_is_rejected() {
    let (env, _admin, client) = setup();
    let inv = invoice(&env, "inv_1");
    let unregistered = category(&env, "travel");

    assert_eq!(
        client.try_set_invoice_category(&inv, &unregistered),
        Err(Ok(Error::UnknownCategory))
    );
    assert_eq!(client.category_of(&inv), None);
}

#[test]
fn a_rejected_tag_leaves_the_previous_category_in_place() {
    let (env, admin, client) = setup();
    let travel = category(&env, "travel");
    let unregistered = category(&env, "music");
    let inv = invoice(&env, "inv_keep");

    client.register_category(&admin, &travel);
    client.set_invoice_category(&inv, &travel);

    assert_eq!(
        client.try_set_invoice_category(&inv, &unregistered),
        Err(Ok(Error::UnknownCategory))
    );
    assert_eq!(client.category_of(&inv), Some(travel));
}

#[test]
fn a_category_past_the_cap_is_rejected() {
    let (env, admin, client) = setup();

    for index in 0..MAX_CATEGORIES {
        let name = format!("cat_{index}");
        client.register_category(&admin, &category(&env, &name));
    }

    let overflow = category(&env, "overflow");
    assert_eq!(
        client.try_register_category(&admin, &overflow),
        Err(Ok(Error::RegistryFull))
    );
    assert_eq!(client.categories().len(), MAX_CATEGORIES);
    assert!(!client.is_registered(&overflow));
    assert_eq!(
        client.try_set_invoice_category(&invoice(&env, "inv_1"), &overflow),
        Err(Ok(Error::UnknownCategory))
    );
}

#[test]
fn a_non_admin_cannot_register_a_category() {
    let (env, _admin, client) = setup();
    let stranger = Address::generate(&env);
    let travel = category(&env, "travel");

    assert_eq!(
        client.try_register_category(&stranger, &travel),
        Err(Ok(Error::NotAdmin))
    );
    assert!(!client.is_registered(&travel));
    assert_eq!(client.categories().len(), 0);
}

#[test]
fn registration_requires_the_admin_signature() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceCategoryRegistry, (admin.clone(),));
    let client = InvoiceCategoryRegistryClient::new(&env, &contract_id);
    let travel = category(&env, "travel");

    // No authorization mocked: the admin address alone is not enough.
    assert!(client.try_register_category(&admin, &travel).is_err());
    assert!(!client.is_registered(&travel));
}

#[test]
fn reading_an_unknown_invoice_returns_none() {
    let (env, _admin, client) = setup();

    assert_eq!(client.category_of(&invoice(&env, "never_tagged")), None);
}

#[test]
fn the_error_codes_and_messages_are_stable() {
    assert_eq!(Error::NotAdmin as u32, 1);
    assert_eq!(Error::UnknownCategory as u32, 2);
    assert_eq!(Error::RegistryFull as u32, 3);

    assert_eq!(
        Error::NotAdmin.message(),
        "Only the admin can register categories."
    );
    assert_eq!(
        Error::UnknownCategory.message(),
        "Category is not registered."
    );
    assert_eq!(
        Error::RegistryFull.message(),
        "The category registry is full."
    );
}
