//! Shared test setup for `invoice-category-registry`.

use invoice_category_registry::{InvoiceCategoryRegistry, InvoiceCategoryRegistryClient};
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, Vec};

/// Deploy the contract with a fresh admin and return the environment, the
/// admin, and a typed client.
///
/// Authorization is mocked here; the suite that checks missing authorization
/// builds its own client without mocking.
pub fn setup() -> (Env, Address, InvoiceCategoryRegistryClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceCategoryRegistry, (admin.clone(),));
    let client = InvoiceCategoryRegistryClient::new(&env, &contract_id);
    (env, admin, client)
}

/// Build a category symbol from a name.
pub fn category(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

/// Build an invoice id symbol from a name.
pub fn invoice(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

/// Register `count` categories named `cat_0`, `cat_1`, ... and return them in
/// registration order.
///
/// Not every suite fills the registry, so an unused copy in one test binary is
/// not a warning.
#[allow(dead_code)]
pub fn register_many(
    env: &Env,
    admin: &Address,
    client: &InvoiceCategoryRegistryClient<'_>,
    count: u32,
) -> Vec<Symbol> {
    let mut registered = Vec::new(env);
    for index in 0..count {
        let name = format!("cat_{index}");
        let symbol = category(env, &name);
        client.register_category(admin, &symbol);
        registered.push_back(symbol);
    }
    registered
}
