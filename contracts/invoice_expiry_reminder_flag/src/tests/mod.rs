mod boundaries;
mod errors;
mod happy_path;
mod scenarios;

use crate::{InvoiceExpiryReminderFlag, InvoiceExpiryReminderFlagClient};
use soroban_sdk::Env;

pub(crate) fn setup() -> (Env, InvoiceExpiryReminderFlagClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlag, ());
    let client = InvoiceExpiryReminderFlagClient::new(&env, &contract_id);
    (env, client)
}
