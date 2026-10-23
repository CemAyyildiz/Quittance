use seller_payout_batch_cap::{
    Error, SellerPayoutBatchCap, SellerPayoutBatchCapClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn oversized_batch_returns_a_contract_error() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, 5_u32));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    assert_eq!(client.try_validate_batch(&6), Err(Ok(Error::BatchTooLarge)));
    assert_eq!(client.max_batch_size(), 5);
}

#[test]
#[should_panic]
fn changing_cap_requires_admin_authorization() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, 5_u32));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    client.set_max_batch_size(&10);
}
