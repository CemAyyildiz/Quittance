//! Failure cases: wrong admin and missing authorization.

use invoice_grace_fee_waiver::{
    Error, InvoiceGraceFeeWaiver, InvoiceGraceFeeWaiverClient,
};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn non_admin_grant_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let stranger = Address::generate(&env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV001");

    assert_eq!(
        client.try_grant_waiver(&stranger, &invoice),
        Err(Ok(Error::NotAuthorised))
    );
    // The rejected grant must not have created a waiver.
    assert!(!client.has_waiver(&invoice));
}

#[test]
fn grant_without_authorization_fails() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV001");

    // No `mock_all_auths`: the admin's `require_auth` must reject the call.
    assert!(client.try_grant_waiver(&admin, &invoice).is_err());
    assert!(!client.has_waiver(&invoice));
}
