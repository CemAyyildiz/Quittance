use crate::{SellerKycFlag, SellerKycFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn rejects_a_set_without_admin_authorization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    assert!(client.try_set_verified(&seller, &true).is_err());
    assert!(!client.is_verified(&seller));
}

#[test]
fn rejected_clear_keeps_the_existing_verification() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    env.mock_all_auths();
    client.set_verified(&seller, &true);
    assert!(client.is_verified(&seller));

    // Drop authorization and try to clear the flag.
    env.mock_auths(&[]);
    assert!(client.try_set_verified(&seller, &false).is_err());
    assert!(client.is_verified(&seller));
}

#[test]
fn rejected_set_does_not_verify_a_never_seen_seller() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(SellerKycFlag, (admin,));
    let client = SellerKycFlagClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    for _ in 0..3 {
        assert!(client.try_set_verified(&seller, &true).is_err());
    }

    assert!(!client.is_verified(&seller));
}
