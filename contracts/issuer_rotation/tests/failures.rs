use issuer_rotation::{IssuerRotation, IssuerRotationClient};
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

#[test]
fn cannot_rotate_an_uninitialized_invoice() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "missing");
    let old_issuer = Address::generate(&env);
    let new_issuer = Address::generate(&env);

    assert!(client
        .try_rotate_issuer(&invoice, &old_issuer, &new_issuer)
        .is_err());
}

#[test]
fn initialization_is_only_allowed_once() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "initialized");
    let issuer = Address::generate(&env);
    let other = Address::generate(&env);

    client.initialize(&invoice, &issuer);
    assert!(client.try_initialize(&invoice, &other).is_err());
}

#[test]
fn initialization_requires_issuer_authorization() {
    let env = Env::default();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "unauthorized");
    let issuer = Address::generate(&env);

    assert!(client.try_initialize(&invoice, &issuer).is_err());
}
