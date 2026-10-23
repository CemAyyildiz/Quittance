use seller_minimum_invoice_amount::{
    SellerMinimumInvoiceAmount, SellerMinimumInvoiceAmountClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn stores_and_reads_back_the_minimum() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    assert_eq!(client.minimum_for(&seller), 0);
    assert!(client.is_valid_amount(&seller, &0));

    client.set_minimum(&seller, &100);
    assert_eq!(client.minimum_for(&seller), 100);
}

#[test]
fn accepts_amounts_at_or_above_the_minimum() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_minimum(&seller, &100);
    assert!(client.is_valid_amount(&seller, &100));
    assert!(client.is_valid_amount(&seller, &250));
}

#[test]
fn rejects_amounts_below_the_minimum() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_minimum(&seller, &100);
    assert!(!client.is_valid_amount(&seller, &99));
    assert!(!client.is_valid_amount(&seller, &1));
}
