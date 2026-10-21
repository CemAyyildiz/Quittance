use super::address;

use soroban_sdk::Env;

#[test]
#[should_panic]
fn a_different_admin_is_rejected() {
    let env = Env::default();
    let admin = address(&env);
    let other = address(&env);
    let who = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();
    api.deny(&other, &who);
}

#[test]
#[should_panic]
fn admin_cannot_deny_self() {
    let env = Env::default();
    let admin = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();
    api.deny(&admin, &admin);
}

#[test]
#[should_panic]
fn deny_without_auth_panics() {
    let env = Env::default();
    let admin = address(&env);
    let who = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    api.deny(&admin, &who);
}
