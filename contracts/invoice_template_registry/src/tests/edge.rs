use crate::{InvoiceTemplateRegistry, InvoiceTemplateRegistryClient};
use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};

#[test]
fn test_multiple_sellers_isolated_namespaces() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTemplateRegistry, ());
    let client = InvoiceTemplateRegistryClient::new(&env, &contract_id);

    let seller_a = Address::generate(&env);
    let seller_b = Address::generate(&env);

    let same_id = symbol_short!("plan_a");
    let memo_a = symbol_short!("memo_a");
    let memo_b = symbol_short!("memo_b");

    client.register_template(&seller_a, &same_id, &100, &memo_a);
    client.register_template(&seller_b, &same_id, &200, &memo_b);

    let res_a = client.template_for(&seller_a, &same_id).unwrap();
    let res_b = client.template_for(&seller_b, &same_id).unwrap();

    assert_eq!(res_a.amount, 100);
    assert_eq!(res_a.memo, memo_a);
    assert_eq!(res_b.amount, 200);
    assert_eq!(res_b.memo, memo_b);

    // Delete seller_a's template does not impact seller_b
    client.remove_template(&seller_a, &same_id);
    assert!(!client.has_template(&seller_a, &same_id));
    assert!(client.has_template(&seller_b, &same_id));
}
