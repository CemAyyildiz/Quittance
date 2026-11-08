use invoice_draft_flag::{InvoiceDraftFlag, InvoiceDraftFlagClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceDraftFlagClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(InvoiceDraftFlag, ());
    let client = InvoiceDraftFlagClient::new(&env, &id);
    (env, client)
}
