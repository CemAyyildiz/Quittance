use super::address;

use crate::Role;
use soroban_sdk::Env;

#[test]
fn a_denied_address_is_blocked_as_issuer_and_payer() {
    let env = Env::default();
    let admin = address(&env);
    let who = address(&env);
    let open = address(&env);
    let contract_id = env.register(crate::AddressDenylist, (admin.clone(),));
    let api = crate::AddressDenylistClient::new(&env, &contract_id);
    env.mock_all_auths();

    api.deny(&admin, &who);

    assert!(!api.role_allowed(&who, &Role::Issuer));
    assert!(!api.role_allowed(&who, &Role::Payer));
    assert!(api.role_allowed(&open, &Role::Issuer));
    assert!(api.role_allowed(&open, &Role::Payer));
}
