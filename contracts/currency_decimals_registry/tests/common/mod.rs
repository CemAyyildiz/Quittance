use currency_decimals_registry::CurrencyDecimalsRegistry;
use soroban_sdk::{testutils::Address as _, Address, Env};

pub fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(CurrencyDecimalsRegistry, (admin.clone(),));
    (env, admin, contract_id)
}
