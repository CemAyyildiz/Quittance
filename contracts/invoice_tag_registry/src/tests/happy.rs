use crate::{InvoiceTagRegistry, InvoiceTagRegistryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_add_and_retrieve_tags() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTagRegistry, ());
    let client = InvoiceTagRegistryClient::new(&env, &contract_id);

    let inv = symbol_short!("inv_101");
    let tag_retail = symbol_short!("retail");
    let tag_paid = symbol_short!("paid");

    assert!(client.tags_for(&inv).is_empty());

    client.add_tag(&inv, &tag_retail);
    client.add_tag(&inv, &tag_paid);

    let list = client.tags_for(&inv);
    assert_eq!(list.len(), 2);
    assert_eq!(list.get(0).unwrap(), tag_retail);
    assert_eq!(list.get(1).unwrap(), tag_paid);
}
