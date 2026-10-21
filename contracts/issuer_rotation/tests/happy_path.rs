use issuer_rotation::{IssuerRotation, IssuerRotationClient};
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

#[test]
fn authorized_issuer_can_rotate_once() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "invoice");
    let old_issuer = Address::generate(&env);
    let new_issuer = Address::generate(&env);

    client.initialize(&invoice, &old_issuer);
    client.rotate_issuer(&invoice, &old_issuer, &new_issuer);
    assert_eq!(client.issuer(&invoice), Some(new_issuer));
}
