use seller_payout_batch_cap::{SellerPayoutBatchCap, SellerPayoutBatchCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn zero_cap_allows_only_empty_batch() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, 0_u32));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    assert!(client.is_batch_allowed(&0));
    assert!(!client.is_batch_allowed(&1));
}

#[test]
fn maximum_u32_cap_accepts_every_representable_size() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, u32::MAX));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    assert!(client.is_batch_allowed(&u32::MAX));
}
