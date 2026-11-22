use payment_duplicate_window_guard::{
    PaymentDuplicateWindowGuard, PaymentDuplicateWindowGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn older_record_is_rejected_without_overwriting() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("order");

    assert!(client.record_reference(&reference, &50));
    assert!(!client.record_reference(&reference, &49));
    assert_eq!(client.last_seen(&reference), Some(50));
}

#[test]
fn backwards_query_is_conservatively_duplicate() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("clock");

    client.record_reference(&reference, &50);
    assert!(client.is_duplicate(&reference, &49, &0));
}
