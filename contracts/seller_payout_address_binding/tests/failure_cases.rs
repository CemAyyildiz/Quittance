mod common;

use common::setup;
use seller_payout_address_binding::PayoutBindingError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn rejects_early_rebind_and_ledger_regression() {
    let (env, client) = setup();
    let seller = Address::generate(&env);
    let p1 = Address::generate(&env);
    let p2 = Address::generate(&env);

    client.bind(&seller, &p1, &500);
    assert_eq!(
        client.try_bind(&seller, &p2, &450),
        Err(Ok(PayoutBindingError::LedgerRegression))
    );
    assert_eq!(
        client.try_bind(&seller, &p2, &550),
        Err(Ok(PayoutBindingError::RebindCooldownActive))
    );
}
