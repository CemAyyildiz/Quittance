use payment_duplicate_window_guard::{
    PaymentDuplicateWindowGuard, PaymentDuplicateWindowGuardClient,
};
use soroban_sdk::{symbol_short, Env};

#[test]
fn expired_reference_can_start_a_new_window() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let reference = symbol_short!("reuse");

    client.record_reference(&reference, &10);
    assert!(!client.is_duplicate(&reference, &16, &5));
    assert!(client.record_reference(&reference, &16));
    assert!(client.is_duplicate(&reference, &20, &5));
}

#[test]
fn references_have_independent_windows() {
    let env = Env::default();
    let id = env.register(PaymentDuplicateWindowGuard, ());
    let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
    let first = symbol_short!("first");
    let second = symbol_short!("second");

    client.record_reference(&first, &10);
    client.record_reference(&second, &20);
    assert!(!client.is_duplicate(&first, &20, &5));
    assert!(client.is_duplicate(&second, &20, &5));
}
