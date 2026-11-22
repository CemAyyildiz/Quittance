use seller_minimum_invoice_amount::{
    SellerMinimumInvoiceAmount, SellerMinimumInvoiceAmountClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn zero_minimum_accepts_any_nonnegative_amount() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_minimum(&seller, &0);
    assert!(client.is_valid_amount(&seller, &0));
    assert!(client.is_valid_amount(&seller, &1));
    assert!(client.is_valid_amount(&seller, &i128::MAX));
}

#[test]
fn tight_minimum_boundary_between_zero_and_one() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_minimum(&seller, &1);
    assert!(!client.is_valid_amount(&seller, &0));
    assert!(client.is_valid_amount(&seller, &1));
}
