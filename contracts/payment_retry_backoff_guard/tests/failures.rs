use payment_retry_backoff_guard::{
    Error, PaymentRetryBackoffGuard, PaymentRetryBackoffGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn early_retry_is_rejected_without_mutation() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let reference = symbol_short!("early");

    client.record_attempt(&reference, &100, &5);
    assert_eq!(
        client.try_record_attempt(&reference, &104, &5),
        Err(Ok(Error::RetryTooSoon))
    );
    assert_eq!(client.last_attempt(&reference), Some(100));
}

#[test]
fn ledger_regression_is_rejected_without_mutation() {
    let env = Env::default();
    let id = env.register(PaymentRetryBackoffGuard, ());
    let client = PaymentRetryBackoffGuardClient::new(&env, &id);
    let reference = symbol_short!("clock");

    client.record_attempt(&reference, &100, &5);
    assert_eq!(
        client.try_record_attempt(&reference, &99, &0),
        Err(Ok(Error::LedgerRegression))
    );
    assert_eq!(client.last_attempt(&reference), Some(100));
}
