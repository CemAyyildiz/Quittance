use crate::{SellerKycFlag, SellerKycFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn only_the_admin_authorization_is_recorded() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin.clone(),));
    env.mock_all_auths();
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_verified(&seller, &true);

    let auths = env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths.first().unwrap().0, admin);
}

#[test]
fn admin_can_toggle_verification_repeatedly() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    for expected in [true, false, true, false] {
        client.set_verified(&seller, &expected);
        assert_eq!(client.is_verified(&seller), expected);
    }
}

#[test]
fn clearing_one_seller_leaves_others_verified() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let stays_verified = Address::generate(&env);
    let cleared = Address::generate(&env);

    client.set_verified(&stays_verified, &true);
    client.set_verified(&cleared, &true);
    client.set_verified(&cleared, &false);

    assert!(client.is_verified(&stays_verified));
    assert!(!client.is_verified(&cleared));
}
