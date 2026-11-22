use payment_duplicate_window_guard::{
    PaymentDuplicateWindowGuard, PaymentDuplicateWindowGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn duplicate_window_is_inclusive() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("edge");

    client.record_reference(&reference, &20);
    assert!(client.is_duplicate(&reference, &20, &3));
    assert!(client.is_duplicate(&reference, &23, &3));
    assert!(!client.is_duplicate(&reference, &24, &3));
}

#[test]
fn zero_window_only_covers_the_recorded_ledger() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("zero");

    client.record_reference(&reference, &u32::MAX);
    assert!(client.is_duplicate(&reference, &u32::MAX, &0));
}
