use soroban_sdk::{Env, Vec};

use crate::{PayoutSplit, PayoutSplitClient};

pub fn client(env: &Env) -> PayoutSplitClient<'_> {
    let contract_id = env.register(PayoutSplit, ());
    PayoutSplitClient::new(env, &contract_id)
}

pub fn shares(env: &Env, values: &[u32]) -> Vec<u32> {
    let mut out = Vec::new(env);
    for value in values {
        out.push_back(*value);
    }
    out
}

mod edge;
mod failure;
mod happy;
mod remainder;
