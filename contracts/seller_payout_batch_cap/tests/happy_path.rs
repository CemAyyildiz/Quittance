use seller_payout_batch_cap::{SellerPayoutBatchCap, SellerPayoutBatchCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn allows_batches_up_to_the_configured_cap() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let id = env.register(SellerPayoutBatchCap, (admin, 25_u32));
    let client = SellerPayoutBatchCapClient::new(&env, &id);

    assert_eq!(client.max_batch_size(), 25);
    assert!(client.is_batch_allowed(&12));
    assert!(client.is_batch_allowed(&25));
    assert_eq!(client.validate_batch(&25), ());
}
