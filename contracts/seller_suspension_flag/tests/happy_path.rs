use seller_suspension_flag::{SellerSuspensionFlag, SellerSuspensionFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn admin_can_suspend_and_reinstate_a_seller() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin.clone(),));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    assert!(client.is_allowed(&seller));
    client.suspend(&seller);
    assert!(client.is_suspended(&seller));
    assert!(!client.is_allowed(&seller));
    client.reinstate(&seller);
    assert!(!client.is_suspended(&seller));
}
