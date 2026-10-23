use payment_duplicate_window_guard::{
    PaymentDuplicateWindowGuard, PaymentDuplicateWindowGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn records_and_detects_a_recent_reference() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("pay_1");

    assert!(client.record_reference(&reference, &100));
    assert_eq!(client.last_seen(&reference), Some(100));
    assert!(client.is_duplicate(&reference, &104, &5));
}

#[test]
fn unseen_reference_is_not_a_duplicate() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);

    assert!(!client.is_duplicate(&symbol_short!("fresh"), &100, &10));
}
