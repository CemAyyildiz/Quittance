use soroban_sdk::Env;
use super::address;
use crate::{PaymentReceiptCounter, PaymentReceiptCounterClient};

#[test]
fn unrecorded_payer_returns_zero() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);

    assert_eq!(client.count_for(&payer), 0);
}

#[test]
fn multiple_successive_payments_accumulate() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    for i in 1..=10 {
        assert_eq!(client.record_payment(&payer), i);
    }
    assert_eq!(client.count_for(&payer), 10);
    assert_eq!(client.total_payments(), 10);
}
