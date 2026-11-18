use crate::{InvoiceTemplateRegistry, InvoiceTemplateRegistryClient};
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

#[test]
fn test_register_and_retrieve_template() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let template_id = symbol_short!("monthly");
    let memo = symbol_short!("nov_inv");

    assert!(!client.has_template(&seller, &template_id));
    assert_eq!(client.template_for(&seller, &template_id), None);

    client.register_template(&seller, &template_id, &1_500_000_000_000, &memo);

    assert!(client.has_template(&seller, &template_id));
    let stored = client.template_for(&seller, &template_id).unwrap();
    assert_eq!(stored.amount, 1_500_000_000_000);
    assert_eq!(stored.memo, memo);
}
