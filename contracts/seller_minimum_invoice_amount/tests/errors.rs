use seller_minimum_invoice_amount::{
    Error, SellerMinimumInvoiceAmount, SellerMinimumInvoiceAmountClient,
};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn rejects_negative_minimum_and_keeps_previous_value() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    client.set_minimum(&seller, &100);
    assert_eq!(
        client.try_set_minimum(&seller, &-1),
        Err(Ok(Error::NegativeMinimum))
    );
    // The rejected write must not have changed the stored minimum.
    assert_eq!(client.minimum_for(&seller), 100);
}

#[test]
fn zero_minimum_is_accepted_as_non_negative() {
    let env = Env::default();
    let contract_id = env.register(SellerMinimumInvoiceAmount, ());
    let client = SellerMinimumInvoiceAmountClient::new(&env, &contract_id);
    let seller = Address::generate(&env);

    assert_eq!(client.try_set_minimum(&seller, &0), Ok(Ok(())));
    assert_eq!(client.minimum_for(&seller), 0);
}
