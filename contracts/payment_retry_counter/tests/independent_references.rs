use payment_retry_counter::{PaymentRetryCounter, PaymentRetryCounterClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn references_have_independent_counts() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let first = symbol_short!("payment_a");
    let second = symbol_short!("payment_b");

    assert_eq!(client.record_attempt(&first, &1), 1);
    assert!(!client.can_retry(&first, &1));
    assert!(client.can_retry(&second, &1));
    assert_eq!(client.record_attempt(&second, &1), 1);
    assert_eq!(client.get_attempts(&first), 1);
    assert_eq!(client.get_attempts(&second), 1);
}

#[test]
fn cap_is_checked_on_each_recording_call() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("payment_c");

    assert_eq!(client.record_attempt(&reference, &1), 1);
    assert!(client.can_retry(&reference, &2));
    assert_eq!(client.record_attempt(&reference, &2), 2);
}
