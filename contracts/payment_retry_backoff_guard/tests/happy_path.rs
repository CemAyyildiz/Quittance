use payment_retry_backoff_guard::{
    PaymentRetryBackoffGuard, PaymentRetryBackoffGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn accepts_first_attempt_and_retry_after_gap() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let reference = symbol_short!("pay_1");

    assert_eq!(client.last_attempt(&reference), None);
    assert_eq!(client.record_attempt(&reference, &100, &5), ());
    assert_eq!(client.last_attempt(&reference), Some(100));
    assert_eq!(client.record_attempt(&reference, &106, &5), ());
    assert_eq!(client.last_attempt(&reference), Some(106));
}
