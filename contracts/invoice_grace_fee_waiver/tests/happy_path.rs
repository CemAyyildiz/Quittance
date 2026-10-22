//! Happy-path flows: grant -> has -> consume.

use invoice_grace_fee_waiver::{InvoiceGraceFeeWaiver, InvoiceGraceFeeWaiverClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

#[test]
fn grant_has_consume_round_trip() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(&env, &contract_id);
    let invoice = symbol_short!("INV001");

    assert!(!client.has_waiver(&invoice));
    assert!(client.grant_waiver(&admin, &invoice));
    assert!(client.has_waiver(&invoice));
    assert!(client.consume_waiver(&invoice));
    assert!(!client.has_waiver(&invoice));
}

#[test]
fn constructor_stores_admin() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(&env, &contract_id);

    assert_eq!(client.admin(), admin);
}
