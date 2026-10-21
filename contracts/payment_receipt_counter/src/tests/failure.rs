use soroban_sdk::Env;
use super::address;
use crate::{PaymentReceiptCounter, PaymentReceiptCounterClient};

#[test]
#[should_panic]
fn record_without_auth_panics() {
    let env = Env::default();
    let payer = address(&env);
    let contract_id = env.register(PaymentReceiptCounter, ());
    let client = PaymentReceiptCounterClient::new(&env, &contract_id);
    // Note: auth NOT mocked -> will panic on require_auth

    client.record_payment(&payer);
}
