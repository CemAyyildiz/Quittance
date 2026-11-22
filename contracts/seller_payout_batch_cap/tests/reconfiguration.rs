use seller_payout_batch_cap::{SellerPayoutBatchCap, SellerPayoutBatchCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn admin_can_raise_and_lower_the_cap() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, 5_u32));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    assert!(!client.is_batch_allowed(&6));
    client.set_max_batch_size(&8);
    assert!(client.is_batch_allowed(&6));
    client.set_max_batch_size(&2);
    assert!(!client.is_batch_allowed(&3));
    assert_eq!(client.max_batch_size(), 2);
}
