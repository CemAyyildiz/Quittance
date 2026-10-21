use payment_retry_counter::{PaymentRetryCounter, PaymentRetryCounterClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn records_attempts_until_the_cap() {
    let env = Env::default();
    let contract_id = env.register(PaymentRetryCounter, ());
    let client = PaymentRetryCounterClient::new(&env, &contract_id);
    let reference = symbol_short!("invoice_1");

    assert_eq!(client.get_attempts(&reference), 0);
    assert!(client.can_retry(&reference, &2));
    assert_eq!(client.record_attempt(&reference, &2), 1);
    assert_eq!(client.record_attempt(&reference, &2), 2);
    assert_eq!(client.get_attempts(&reference), 2);
    assert!(!client.can_retry(&reference, &2));
}
