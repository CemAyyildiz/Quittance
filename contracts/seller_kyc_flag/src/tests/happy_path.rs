use crate::{SellerKycFlag, SellerKycFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn admin_verifies_a_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    assert!(!client.is_verified(&seller));

    client.set_verified(&seller, &true);

    assert!(client.is_verified(&seller));
}

#[test]
fn admin_can_clear_a_verified_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_verified(&seller, &true);
    client.set_verified(&seller, &false);

    assert!(!client.is_verified(&seller));
}

#[test]
fn setting_the_current_value_is_an_idempotent_success() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_verified(&seller, &true);
    client.set_verified(&seller, &true);
    assert!(client.is_verified(&seller));

    client.set_verified(&seller, &false);
    client.set_verified(&seller, &false);
    assert!(!client.is_verified(&seller));
}
