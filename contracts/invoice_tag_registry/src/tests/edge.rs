use crate::{InvoiceTagRegistry, InvoiceTagRegistryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_multiple_invoices_tag_isolation() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTagRegistry, ());
    let client = InvoiceTagRegistryClient::new(&env, &contract_id);

    let inv_1 = symbol_short!("inv_1");
    let inv_2 = symbol_short!("inv_2");
    let common_tag = symbol_short!("urgent");
    let tag_b2b = symbol_short!("b2b");

    client.add_tag(&inv_1, &common_tag);
    client.add_tag(&inv_1, &tag_b2b);

    client.add_tag(&inv_2, &common_tag);

    assert_eq!(client.tags_for(&inv_1).len(), 2);
    assert_eq!(client.tags_for(&inv_2).len(), 1);

    // Remove from inv_1 does not affect inv_2
    client.remove_tag(&inv_1, &common_tag);
    assert_eq!(client.tags_for(&inv_1).len(), 1);
    assert_eq!(client.tags_for(&inv_2).len(), 1);
}
