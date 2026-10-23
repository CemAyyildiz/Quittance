use seller_suspension_flag::{SellerSuspensionFlag, SellerSuspensionFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn operations_are_idempotent() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin,));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    client.suspend(&seller);
    client.suspend(&seller);
    assert!(client.is_suspended(&seller));
    client.reinstate(&seller);
    client.reinstate(&seller);
    assert!(client.is_allowed(&seller));
}

#[test]
fn administrator_can_also_be_flagged_as_a_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin.clone(),));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    client.suspend(&admin);
    assert!(client.is_suspended(&admin));
}
