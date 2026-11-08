mod common;

use common::setup;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address,
};

#[test]
fn tracks_payer_stats_and_last_payment_ledger() {
    let (env, client) = setup();
    let payer = Address::generate(&env);

    let initial = client.stats_for(&payer);
    assert_eq!(initial.successful_payments, 0);
    assert_eq!(initial.last_payment_ledger, 0);

    env.ledger().with_mut(|l| l.sequence_number = 77);
    client.record_payment(&payer);

    let updated = client.stats_for(&payer);
    assert_eq!(updated.successful_payments, 1);
    assert_eq!(updated.last_payment_ledger, 77);
}
