use seller_suspension_flag::{SellerSuspensionFlag, SellerSuspensionFlagClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
#[should_panic]
fn suspend_requires_admin_authorization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin,));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    client.suspend(&seller);
}

#[test]
#[should_panic]
fn reinstate_requires_admin_authorization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let id = env.register(SellerSuspensionFlag, (admin,));
    let client = SellerSuspensionFlagClient::new(&env, &id);

    client.reinstate(&seller);
}
