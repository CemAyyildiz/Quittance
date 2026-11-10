use invoice_template_registry::{
    InvoiceTemplateRegistryContract, InvoiceTemplateRegistryContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceTemplateRegistryContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceTemplateRegistryContract, ());
    let client = InvoiceTemplateRegistryContractClient::new(&env, &contract_id);
    (env, client)
}
