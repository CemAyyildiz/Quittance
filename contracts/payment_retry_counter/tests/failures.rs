use payment_retry_counter::{Error, PaymentRetryCounter, PaymentRetryCounterClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn exhausted_cap_returns_error_without_incrementing() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("invoice_4");

    assert_eq!(client.record_attempt(&reference, &1), 1);
    assert_eq!(
        client.try_record_attempt(&reference, &1),
        Err(Ok(Error::RetryLimitReached))
    );
    assert_eq!(client.get_attempts(&reference), 1);
}

#[test]
fn zero_cap_rejects_recording_without_creating_a_count() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("invoice_5");

    assert_eq!(
        client.try_record_attempt(&reference, &0),
        Err(Ok(Error::RetryLimitReached))
    );
    assert_eq!(client.get_attempts(&reference), 0);
}
