use issuer_rotation::{IssuerRotation, IssuerRotationClient};
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

#[test]
fn cannot_rotate_to_the_same_issuer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "same");
    let issuer = Address::generate(&env);

    client.initialize(&invoice, &issuer);
    assert!(client
        .try_rotate_issuer(&invoice, &issuer, &issuer)
        .is_err());
}
