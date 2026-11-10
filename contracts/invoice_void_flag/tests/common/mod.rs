use invoice_void_flag::{InvoiceVoidFlagContract, InvoiceVoidFlagContractClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceVoidFlagContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceVoidFlagContract, ());
    let client = InvoiceVoidFlagContractClient::new(&env, &contract_id);
    (env, client)
}
