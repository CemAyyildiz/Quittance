use crate::{InvoiceTemplateRegistry, InvoiceTemplateRegistryClient};
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

#[test]
fn test_overwrite_existing_template_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);

    let seller = Address::generate(&env);
    let template_id = symbol_short!("tier1");
    let memo_v1 = symbol_short!("memo_v1");
    let memo_v2 = symbol_short!("memo_v2");

    client.register_template(&seller, &template_id, &500, &memo_v1);
    let t1 = client.template_for(&seller, &template_id).unwrap();
    assert_eq!(t1.amount, 500);
    assert_eq!(t1.memo, memo_v1);

    // Overwrite with updated values
    client.register_template(&seller, &template_id, &750, &memo_v2);
    let t2 = client.template_for(&seller, &template_id).unwrap();
    assert_eq!(t2.amount, 750);
    assert_eq!(t2.memo, memo_v2);
}
