use seller_minimum_invoice_amount::{
    SellerMinimumInvoiceAmount, SellerMinimumInvoiceAmountClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn unknown_seller_defaults_to_no_minimum() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    assert_eq!(client.minimum_for(&seller), 0);
    assert!(client.is_valid_amount(&seller, &0));
}

#[test]
fn per_seller_minimums_are_independent() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller_a = Address::generate(&env);
    let seller_b = Address::generate(&env);

    client.set_minimum(&seller_a, &500);
    client.set_minimum(&seller_b, &50);

    assert!(!client.is_valid_amount(&seller_a, &499));
    assert!(client.is_valid_amount(&seller_a, &500));
    assert!(client.is_valid_amount(&seller_b, &50));
    assert!(!client.is_valid_amount(&seller_b, &49));
}
