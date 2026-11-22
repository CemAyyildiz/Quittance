use payment_retry_backoff_guard::{
    PaymentRetryBackoffGuard, PaymentRetryBackoffGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn references_and_per_call_policies_are_independent() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let first = symbol_short!("first");
    let second = symbol_short!("second");

    client.record_attempt(&first, &10, &100);
    assert!(!client.can_attempt(&first, &12, &5));
    assert!(client.can_attempt(&first, &12, &2));
    assert!(client.can_attempt(&second, &1, &u32::MAX));
    client.record_attempt(&second, &1, &u32::MAX);

    assert_eq!(client.last_attempt(&first), Some(10));
    assert_eq!(client.last_attempt(&second), Some(1));
}
