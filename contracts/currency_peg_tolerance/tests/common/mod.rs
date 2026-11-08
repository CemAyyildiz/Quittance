use currency_peg_tolerance::{CurrencyPegToleranceContract, CurrencyPegToleranceContractClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, CurrencyPegToleranceContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(CurrencyPegToleranceContract, ());
    let client = CurrencyPegToleranceContractClient::new(&env, &contract_id);
    (env, client)
}
