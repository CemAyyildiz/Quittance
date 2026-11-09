mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceDraftFlag, InvoiceDraftFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

pub(crate) fn setup() -> (Env, InvoiceDraftFlagClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(InvoiceDraftFlag, ());
    let client = InvoiceDraftFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);
    (env, client, seller)
}
