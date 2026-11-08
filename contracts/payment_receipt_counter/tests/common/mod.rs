use payment_receipt_counter::{PaymentReceiptCounterContract, PaymentReceiptCounterContractClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, PaymentReceiptCounterContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReceiptCounterContract, ());
    let client = PaymentReceiptCounterContractClient::new(&env, &contract_id);
    (env, client)
}
