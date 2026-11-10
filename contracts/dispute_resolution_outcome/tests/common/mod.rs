use dispute_resolution_outcome::{
    DisputeResolutionOutcomeContract, DisputeResolutionOutcomeContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, DisputeResolutionOutcomeContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(DisputeResolutionOutcomeContract, ());
    let client = DisputeResolutionOutcomeContractClient::new(&env, &contract_id);
    (env, client)
}
