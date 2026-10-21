use soroban_sdk::Env;
use super::address;
use crate::{PaymentReceiptCounter, PaymentReceiptCounterClient};

#[test]
fn increments_counter_for_payer() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    assert_eq!(client.count_for(&payer), 0);
    assert_eq!(client.total_payments(), 0);

    assert_eq!(client.record_payment(&payer), 1);
    assert_eq!(client.count_for(&payer), 1);
    assert_eq!(client.total_payments(), 1);

    assert_eq!(client.record_payment(&payer), 2);
    assert_eq!(client.count_for(&payer), 2);
    assert_eq!(client.total_payments(), 2);
}
