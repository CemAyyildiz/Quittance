use payment_retry_counter::{PaymentRetryCounter, PaymentRetryCounterClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn zero_cap_disables_even_the_first_retry() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("invoice_2");

    assert!(!client.can_retry(&reference, &0));
    assert_eq!(client.get_attempts(&reference), 0);
}

#[test]
fn maximum_u32_cap_allows_first_attempt() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("invoice_3");

    assert!(client.can_retry(&reference, &u32::MAX));
    assert_eq!(client.record_attempt(&reference, &u32::MAX), 1);
}
