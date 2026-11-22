use payment_retry_backoff_guard::{
    PaymentRetryBackoffGuard, PaymentRetryBackoffGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn exact_minimum_gap_is_allowed() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let reference = symbol_short!("edge");

    client.record_attempt(&reference, &10, &5);
    assert!(client.can_attempt(&reference, &15, &5));
    assert_eq!(client.record_attempt(&reference, &15, &5), ());
}

#[test]
fn zero_gap_and_maximum_ledger_are_safe() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let reference = symbol_short!("max");

    client.record_attempt(&reference, &u32::MAX, &0);
    assert!(client.can_attempt(&reference, &u32::MAX, &0));
    assert_eq!(client.record_attempt(&reference, &u32::MAX, &0), ());
}
