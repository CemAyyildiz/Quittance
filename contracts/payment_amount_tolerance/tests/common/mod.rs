use payment_amount_tolerance::{
    PaymentAmountToleranceContract, PaymentAmountToleranceContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, PaymentAmountToleranceContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentAmountToleranceContract, ());
    let client = PaymentAmountToleranceContractClient::new(&env, &contract_id);
    (env, client)
}
