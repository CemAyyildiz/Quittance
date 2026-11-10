use seller_payout_address_binding::{
    SellerPayoutAddressBindingContract, SellerPayoutAddressBindingContractClient,
};
use soroban_sdk::Env;

pub fn setup() -> (Env, SellerPayoutAddressBindingContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(SellerPayoutAddressBindingContract, ());
    let client = SellerPayoutAddressBindingContractClient::new(&env, &contract_id);
    (env, client)
}
