use super::address;

#[test]
fn admin_denies_and_then_allows() {
    let env = soroban_sdk::Env::default();
    let admin = address(&env);
    let who = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();

    assert!(!api.is_denied(&who));
    api.deny(&admin, &who);
    assert!(api.is_denied(&who));
    api.allow(&admin, &who);
    assert!(!api.is_denied(&who));
}
