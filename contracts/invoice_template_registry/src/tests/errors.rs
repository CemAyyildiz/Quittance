//! Error and rejection tests for `invoice-template-registry`.

use super::{new_seller, setup};
use crate::Error;
use soroban_sdk::symbol_short;

#[test]
fn zero_or_negative_amount_is_rejected() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let tpl_id = symbol_short!("BAD_AMT");
    let memo = symbol_short!("MEMO");

    assert_eq!(
        client.try_register_template(&seller, &tpl_id, &0, &memo),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        client.try_register_template(&seller, &tpl_id, &-500, &memo),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(client.template_for(&seller, &tpl_id), None);
}

#[test]
fn duplicate_registration_and_missing_template_updates_are_rejected() {
    let (env, client) = setup();
    let seller = new_seller(&env);
    let tpl_id = symbol_short!("DUP_TPL");
    let memo = symbol_short!("MEMO");

    client.register_template(&seller, &tpl_id, &1_000, &memo);
    assert_eq!(
        client.try_register_template(&seller, &tpl_id, &2_000, &memo),
        Err(Ok(Error::TemplateAlreadyExists))
    );

    let missing = symbol_short!("MISSING");
    assert_eq!(
        client.try_update_template(&seller, &missing, &2_000, &memo),
        Err(Ok(Error::TemplateNotFound))
    );
    assert_eq!(
        client.try_remove_template(&seller, &missing),
        Err(Ok(Error::TemplateNotFound))
    );
    assert!(!Error::InvalidAmount.message().is_empty());
    assert!(!Error::TemplateAlreadyExists.message().is_empty());
    assert!(!Error::TemplateNotFound.message().is_empty());
}
