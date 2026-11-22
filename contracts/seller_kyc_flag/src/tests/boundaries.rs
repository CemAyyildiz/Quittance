use crate::{SellerKycFlag, SellerKycFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn unknown_seller_is_unverified() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);

    assert!(!client.is_verified(&Address::generate(&env)));
}

#[test]
fn verification_is_independent_per_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let verified = Address::generate(&env);
    let unverified = Address::generate(&env);

    client.set_verified(&verified, &true);

    assert!(client.is_verified(&verified));
    assert!(!client.is_verified(&unverified));
}

#[test]
fn clearing_an_already_unverified_seller_stays_false() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_verified(&seller, &false);

    assert!(!client.is_verified(&seller));
}

#[test]
fn every_seller_keeps_its_own_value() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);

    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let third = Address::generate(&env);

    client.set_verified(&first, &true);
    client.set_verified(&second, &false);
    client.set_verified(&third, &true);

    assert!(client.is_verified(&first));
    assert!(!client.is_verified(&second));
    assert!(client.is_verified(&third));
}
