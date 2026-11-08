use invoice_expiry_reminder_flag::{
    InvoiceExpiryReminderFlagContract, InvoiceExpiryReminderFlagContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceExpiryReminderFlagContractClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(InvoiceExpiryReminderFlagContract, ());
    let client = InvoiceExpiryReminderFlagContractClient::new(&env, &contract_id);
    (env, client)
}
