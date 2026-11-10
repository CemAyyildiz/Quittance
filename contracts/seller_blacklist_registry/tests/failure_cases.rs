mod common;

use common::setup;
use seller_blacklist_registry::BlacklistError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn require_allowed_and_double_initialize_return_errors() {
    let (env, client) = setup();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);

    client.initialize(&admin);
    assert_eq!(
        client.try_initialize(&admin),
        Err(Ok(BlacklistError::AlreadyInitialized))
    );

    client.blacklist(&seller);
    assert_eq!(
        client.try_require_allowed(&seller),
        Err(Ok(BlacklistError::SellerBlacklisted))
    );
}
