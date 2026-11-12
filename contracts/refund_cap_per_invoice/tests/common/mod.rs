use refund_cap_per_invoice::{RefundCapPerInvoice, RefundCapPerInvoiceClient};
use soroban_sdk::Env;

pub fn setup() -> (Env, RefundCapPerInvoiceClient<'static>) {
    let env = Env::default();
    let id = env.register(RefundCapPerInvoice, ());
    let client = RefundCapPerInvoiceClient::new(&env, &id);
    (env, client)
}
