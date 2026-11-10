use invoice_cancellation_window::{
    InvoiceCancellationWindowContract, InvoiceCancellationWindowContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceCancellationWindowContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceCancellationWindowContract, ());
    let client = InvoiceCancellationWindowContractClient::new(&env, &contract_id);
    (env, client)
}
