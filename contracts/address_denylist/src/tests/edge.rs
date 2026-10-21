use super::address;

use soroban_sdk::Env;

#[test]
fn denying_twice_stays_denied() {
    let env = Env::default();
    let admin = address(&env);
    let who = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();

    api.deny(&admin, &who);
    api.deny(&admin, &who);
    assert!(api.is_denied(&who));
}

#[test]
fn allowing_an_unknown_address_is_a_no_op() {
    let env = Env::default();
    let admin = address(&env);
    let who = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();

    api.allow(&admin, &who);
    assert!(!api.is_denied(&who));
}
