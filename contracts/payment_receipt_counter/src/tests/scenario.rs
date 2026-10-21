use soroban_sdk::Env;
use super::address;
use crate::{PaymentReceiptCounter, PaymentReceiptCounterClient};

#[test]
fn distinct_payers_track_independent_loyalty_counts() {
    let env = Env::default();
    let payer_a = address(&env);
    let payer_b = address(&env);
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);
    env.mock_all_auths();

    client.record_payment(&payer_a);
    client.record_payment(&payer_a);
    client.record_payment(&payer_b);

    assert_eq!(client.count_for(&payer_a), 2);
    assert_eq!(client.count_for(&payer_b), 1);
    assert_eq!(client.total_payments(), 3);
}
