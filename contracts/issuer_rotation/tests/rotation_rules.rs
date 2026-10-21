use issuer_rotation::{IssuerRotation, IssuerRotationClient};
use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

#[test]
fn a_second_rotation_is_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(IssuerRotation, ());
    let client = IssuerRotationClient::new(&env, &contract_id);
    let invoice = Symbol::new(&env, "one_time");
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);

    client.initialize(&invoice, &first);
    client.rotate_issuer(&invoice, &first, &second);
    assert!(client.try_rotate_issuer(&invoice, &second, &third).is_err());
    assert_eq!(client.issuer(&invoice), Some(second));
}
