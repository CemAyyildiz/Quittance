mod common;

use common::setup;
use seller_cooldown_after_dispute::CooldownError;
use soroban_sdk::{testutils::Address as _, Address};

#[test]
fn require_can_create_rejects_active_cooldown_and_ledger_regression() {
    let (env, client) = setup();
    let seller = Address::generate(&env);

    client.flag_dispute(&seller, &500);
    assert_eq!(
        client.try_require_can_create(&seller, &520, &50),
        Err(Ok(CooldownError::CooldownActive))
    );
    assert_eq!(
        client.try_require_can_create(&seller, &490, &50),
        Err(Ok(CooldownError::InvalidLedgerRegression))
    );
}
