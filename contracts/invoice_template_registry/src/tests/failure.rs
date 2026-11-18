use crate::{types::TemplateError, InvoiceTemplateRegistry, InvoiceTemplateRegistryClient};
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

#[test]
fn test_zero_or_negative_amount_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let template_id = symbol_short!("zero_amt");
    let memo = symbol_short!("memo");

    // Zero amount fails
    let res = client.try_register_template(&seller, &template_id, &0, &memo);
    assert_eq!(res.unwrap_err().unwrap(), TemplateError::InvalidAmount);

    // Negative amount fails
    let res_neg = client.try_register_template(&seller, &template_id, &-500, &memo);
    assert_eq!(res_neg.unwrap_err().unwrap(), TemplateError::InvalidAmount);
}

#[test]
fn test_remove_nonexistent_template_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let missing_id = symbol_short!("missing");

    let res = client.try_remove_template(&seller, &missing_id);
    assert_eq!(res.unwrap_err().unwrap(), TemplateError::TemplateNotFound);
}
