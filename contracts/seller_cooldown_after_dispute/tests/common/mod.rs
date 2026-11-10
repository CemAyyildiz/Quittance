use seller_cooldown_after_dispute::{
    SellerCooldownAfterDisputeContract, SellerCooldownAfterDisputeContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, SellerCooldownAfterDisputeContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(SellerCooldownAfterDisputeContract, ());
    let client = SellerCooldownAfterDisputeContractClient::new(&env, &contract_id);
    (env, client)
}
