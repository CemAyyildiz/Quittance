use crate::{types::TagError, InvoiceTagRegistry, InvoiceTagRegistryClient};
use soroban_sdk::{symbol_short, Env};

#[test]
fn test_duplicate_tag_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTagRegistry, ());
    let client = InvoiceTagRegistryClient::new(&env, &contract_id);

    let inv = symbol_short!("inv_dup");
    let tag = symbol_short!("repeat");

    client.add_tag(&inv, &tag);
    let res = client.try_add_tag(&inv, &tag);
    assert_eq!(res.unwrap_err().unwrap(), TagError::DuplicateTag);
}

#[test]
fn test_remove_nonexistent_tag_rejected() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(InvoiceTagRegistry, ());
    let client = InvoiceTagRegistryClient::new(&env, &contract_id);

    let inv = symbol_short!("inv_miss");
    let missing_tag = symbol_short!("missing");

    let res = client.try_remove_tag(&inv, &missing_tag);
    assert_eq!(res.unwrap_err().unwrap(), TagError::NoTagsFound);
}
