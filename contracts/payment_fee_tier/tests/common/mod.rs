use payment_fee_tier::{PaymentFeeTierContract, PaymentFeeTierContractClient};
use soroban_sdk::{vec, Env, Vec};

pub fn setup() -> (Env, PaymentFeeTierContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentFeeTierContract, ());
    let client = PaymentFeeTierContractClient::new(&env, &contract_id);
    (env, client)
}

pub fn sample_tiers(env: &Env) -> Vec<(i128, u32)> {
    vec![env, (0, 250), (10_000, 175), (100_000, 100)]
}
