use crate::{types::TagError, InvoiceTagRegistry, InvoiceTagRegistryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_max_tags_cap_enforced() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTagRegistry, ());
    let client = InvoiceTagRegistryClient::new(&env, &contract_id);

    let inv = symbol_short!("inv_cap");

    client.add_tag(&inv, &symbol_short!("t1"));
    client.add_tag(&inv, &symbol_short!("t2"));
    client.add_tag(&inv, &symbol_short!("t3"));
    client.add_tag(&inv, &symbol_short!("t4"));
    client.add_tag(&inv, &symbol_short!("t5"));
    client.add_tag(&inv, &symbol_short!("t6"));
    client.add_tag(&inv, &symbol_short!("t7"));
    client.add_tag(&inv, &symbol_short!("t8"));

    // 9th tag must fail with TagLimitExceeded
    let res = client.try_add_tag(&inv, &symbol_short!("t9"));
    assert_eq!(res.unwrap_err().unwrap(), TagError::TagLimitExceeded);

    // Clearing tags resets the capacity
    client.clear_tags(&inv);
    assert!(client.tags_for(&inv).is_empty());
    client.add_tag(&inv, &symbol_short!("t_new"));
    assert_eq!(client.tags_for(&inv).len(), 1);
}
