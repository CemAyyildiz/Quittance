mod common;

use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};
use invoice_draft_flag::{InvoiceDraftFlag, InvoiceDraftFlagClient};

#[test]
#[should_panic]
fn publish_requires_seller_authorization() {
    let env = Env::default();
    let id = env.register(InvoiceDraftFlag, ());
    let client = InvoiceDraftFlagClient::new(&env, &id);
    let seller = Address::generate(&env);
    client.publish(&seller, &symbol_short!("INV_AUTH"));
}
