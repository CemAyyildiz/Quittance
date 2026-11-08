mod common;

use invoice_draft_flag::DraftFlagError;
use soroban_sdk::{symbol_short, testutils::Address as _, Address};

#[test]
fn republishing_an_already_published_invoice_fails() {
    let (env, client) = common::setup();
    let seller = Address::generate(&env);
    let other = Address::generate(&env);
    let inv = symbol_short!("INV1");
    client.publish(&seller, &inv);

    assert_eq!(
        client.try_publish(&seller, &inv),
        Err(Ok(DraftFlagError::AlreadyPublished))
    );
    assert_eq!(
        client.try_publish(&other, &inv),
        Err(Ok(DraftFlagError::AlreadyPublished))
    );
    assert_eq!(client.published_by(&inv), Some(seller));
}
