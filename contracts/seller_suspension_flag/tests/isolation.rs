use seller_suspension_flag::{SellerSuspensionFlag, SellerSuspensionFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn one_sellers_flag_does_not_affect_another() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let first = Address::generate(&env);
    let second = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin.clone(),));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    client.suspend(&first);
    assert!(client.is_suspended(&first));
    assert!(!client.is_suspended(&second));
    assert_eq!(client.admin(), admin);
}
