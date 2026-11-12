use invoice_currency_decimal_guard::{
    InvoiceCurrencyDecimalGuard, InvoiceCurrencyDecimalGuardClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, InvoiceCurrencyDecimalGuardClient<'static>) {
    let env = Env::default();
    let id = env.register(InvoiceCurrencyDecimalGuard, ());
    let client = InvoiceCurrencyDecimalGuardClient::new(&env, &id);
    (env, client)
}
