mod common;

use common::setup;
use invoice_template_registry::TemplateError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn rejects_non_positive_amount_duplicate_registration_and_missing_remove() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let tid = symbol_short!("TPL1");
    let memo = symbol_short!("MEMO");

    assert_eq!(
        client.try_register_template(&seller, &tid, &0, &memo),
        Err(Ok(TemplateError::InvalidAmount))
    );
    assert_eq!(
        client.try_remove_template(&seller, &tid),
        Err(Ok(TemplateError::TemplateNotFound))
    );

    client.register_template(&seller, &tid, &1000, &memo);
    assert_eq!(
        client.try_register_template(&seller, &tid, &2000, &memo),
        Err(Ok(TemplateError::TemplateAlreadyExists))
    );
}
