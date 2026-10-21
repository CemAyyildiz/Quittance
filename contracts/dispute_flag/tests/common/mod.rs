use dispute_flag::{DisputeFlag, DisputeFlagClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _, MockAuth, MockAuthInvoke},
    Address, Env, IntoVal, Symbol,
};

pub fn setup() -> (Env, Address, Address, Address, Symbol) {
    let env = Env::default();
    env.ledger().set_timestamp(1_000);
    let resolver = Address::generate(&env);
    let payer = Address::generate(&env);
    let contract_id = env.register(DisputeFlag, (resolver.clone(),));
    let invoice_id = Symbol::new(&env, "invoice_1");
    (env, contract_id, resolver, payer, invoice_id)
}

pub fn record(
    env: &Env,
    contract_id: &Address,
    resolver: &Address,
    payer: &Address,
    invoice_id: &Symbol,
    paid_at: u64,
    window_secs: u64,
) {
    let client = DisputeFlagClient::new(env, contract_id);
    client
        .mock_auths(&[MockAuth {
            address: resolver,
            invoke: &MockAuthInvoke {
                contract: contract_id,
                fn_name: "record_payment",
                args: (invoice_id, payer, paid_at, window_secs).into_val(env),
                sub_invokes: &[],
            },
        }])
        .record_payment(invoice_id, payer, &paid_at, &window_secs);
}
