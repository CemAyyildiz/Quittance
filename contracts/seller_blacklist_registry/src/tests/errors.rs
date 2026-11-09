//! Admin authorization and failure tests for `seller-blacklist-registry`.

use super::{new_addr, setup};
use crate::{BlacklistError, SellerBlacklistRegistry, SellerBlacklistRegistryClient};
use soroban_sdk::Env;

#[test]
fn duplicate_init_admin_is_rejected() {
    let (env, client) = setup();
    let admin = new_addr(&env);
    let other = new_addr(&env);

    client.init_admin(&admin);
    assert_eq!(client.admin(), Some(admin));
    assert_eq!(
        client.try_init_admin(&other),
        Err(Ok(BlacklistError::AdminAlreadyInitialized))
    );
    assert!(!BlacklistError::AdminAlreadyInitialized.message().is_empty());
}

#[test]
fn unauthenticated_blacklist_call_fails_when_admin_is_configured() {
    let env = Env::default();
    let contract_id = env.register(SellerBlacklistRegistry, ());
    let client = SellerBlacklistRegistryClient::new(&env, &contract_id);

    let admin = new_addr(&env);
    let seller = new_addr(&env);

    env.mock_all_auths();
    client.init_admin(&admin);

    // Clear mocked auths so subsequent call lacks admin signature
    env.set_auths(&[]);
    assert!(client.try_blacklist(&seller).is_err());
    assert!(client.is_allowed(&seller));
}
