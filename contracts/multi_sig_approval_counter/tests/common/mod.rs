use multi_sig_approval_counter::{
    MultiSigApprovalCounterContract, MultiSigApprovalCounterContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, MultiSigApprovalCounterContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultiSigApprovalCounterContract, ());
    let client = MultiSigApprovalCounterContractClient::new(&env, &contract_id);
    (env, client)
}
