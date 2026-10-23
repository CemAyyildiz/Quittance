//! Capacity scenario tests for `invoice-category-registry`.
//!
//! The point of this contract is that the category list is *bounded* while the
//! number of invoices is not. These tests fill the registry to its cap, tag
//! invoices with every category in it, and check that the bound holds no matter
//! how many registration attempts are made afterwards.

mod common;

use common::{category, invoice, register_many, setup};
use invoice_category_registry::{Error, MAX_CATEGORIES};

#[test]
fn every_registered_category_can_tag_an_invoice() {
    let (env, admin, client) = setup();
    let registered = register_many(&env, &admin, &client, MAX_CATEGORIES);

    for index in 0..MAX_CATEGORIES {
        let name = format!("inv_{index}");
        let inv = invoice(&env, &name);
        let cat = registered.get(index).expect("registered category");
        client.set_invoice_category(&inv, &cat);
        assert_eq!(client.category_of(&inv), Some(cat));
    }
}

#[test]
fn a_full_registry_still_answers_reads_and_accepts_existing_categories() {
    let (env, admin, client) = setup();
    let registered = register_many(&env, &admin, &client, MAX_CATEGORIES);

    for index in 0..MAX_CATEGORIES {
        let cat = registered.get(index).expect("registered category");
        assert!(client.is_registered(&cat));

        // Re-registering an existing category is a no-op, even at the cap.
        client.register_category(&admin, &cat);
    }

    assert_eq!(client.categories().len(), MAX_CATEGORIES);
}

#[test]
fn a_rejected_overflow_category_is_never_usable() {
    let (env, admin, client) = setup();
    register_many(&env, &admin, &client, MAX_CATEGORIES);
    let overflow = category(&env, "overflow");

    assert_eq!(
        client.try_register_category(&admin, &overflow),
        Err(Ok(Error::RegistryFull))
    );

    assert!(!client.is_registered(&overflow));
    assert_eq!(
        client.try_set_invoice_category(&invoice(&env, "inv_overflow"), &overflow),
        Err(Ok(Error::UnknownCategory))
    );
}

#[test]
fn the_registry_never_grows_past_the_bound() {
    let (env, admin, client) = setup();
    register_many(&env, &admin, &client, MAX_CATEGORIES);

    for index in 0..5 {
        let name = format!("extra_{index}");
        let rejected = category(&env, &name);
        assert_eq!(
            client.try_register_category(&admin, &rejected),
            Err(Ok(Error::RegistryFull))
        );
        assert_eq!(client.categories().len(), MAX_CATEGORIES);
    }
}

#[test]
fn a_tag_recorded_before_the_registry_filled_survives() {
    let (env, admin, client) = setup();
    let first = category(&env, "cat_0");
    let inv = invoice(&env, "inv_early");

    client.register_category(&admin, &first);
    client.set_invoice_category(&inv, &first);

    // Fills the rest of the registry; `cat_0` is already there, so the
    // repeated registration is a no-op and the list ends up exactly full.
    register_many(&env, &admin, &client, MAX_CATEGORIES);

    assert_eq!(client.categories().len(), MAX_CATEGORIES);
    assert_eq!(client.category_of(&inv), Some(first));
}
