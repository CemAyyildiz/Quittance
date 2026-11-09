//! Test suite for `payment-fee-tier`.

mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{PaymentFeeTier, PaymentFeeTierClient};
use soroban_sdk::{vec, Env, Vec};

pub(crate) fn setup() -> (Env, PaymentFeeTierClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentFeeTier, ());
    let client = PaymentFeeTierClient::new(&env, &contract_id);
    (env, client)
}

pub(crate) fn standard_tiers(env: &Env) -> Vec<(i128, u32)> {
    vec![
        env,
        (0_i128, 100_u32),       // 0+: 1.00%
        (10_000_i128, 75_u32),   // 10k+: 0.75%
        (50_000_i128, 50_u32),   // 50k+: 0.50%
        (250_000_i128, 25_u32),  // 250k+: 0.25%
    ]
}
