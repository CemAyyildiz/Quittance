//! Boundary and independence cases around the waiver lifecycle.

use invoice_grace_fee_waiver::{InvoiceGraceFeeWaiver, InvoiceGraceFeeWaiverClient};
use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (Address, InvoiceGraceFeeWaiverClient<'_>) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let contract_id = env.register(InvoiceGraceFeeWaiver, (&admin,));
    let client = InvoiceGraceFeeWaiverClient::new(env, &contract_id);
    (admin, client)
}

#[test]
fn consuming_a_never_granted_waiver_returns_false() {
    let env = Env::default();
    let (_admin, client) = setup(&env);
    let invoice = symbol_short!("INV001");

    assert!(!client.consume_waiver(&invoice));
    assert!(!client.has_waiver(&invoice));
}

#[test]
fn grant_twice_while_outstanding_returns_false() {
    let env = Env::default();
    let (admin, client) = setup(&env);
    let invoice = symbol_short!("INV001");

    assert!(client.grant_waiver(&admin, &invoice));
    assert!(!client.grant_waiver(&admin, &invoice));
    // Still exactly one outstanding waiver; consuming works once.
    assert!(client.has_waiver(&invoice));
    assert!(client.consume_waiver(&invoice));
}

#[test]
fn consumed_waiver_cannot_be_re_granted() {
    let env = Env::default();
    let (admin, client) = setup(&env);
    let invoice = symbol_short!("INV001");

    assert!(client.grant_waiver(&admin, &invoice));
    assert!(client.consume_waiver(&invoice));

    // Non-reversible: a consumed waiver is terminal.
    assert!(!client.grant_waiver(&admin, &invoice));
    assert!(!client.has_waiver(&invoice));
    assert!(!client.consume_waiver(&invoice));
}

#[test]
fn waivers_are_independent_per_invoice() {
    let env = Env::default();
    let (admin, client) = setup(&env);
    let first = symbol_short!("INV001");
    let second = symbol_short!("INV002");

    assert!(client.grant_waiver(&admin, &first));
    assert!(client.grant_waiver(&admin, &second));

    assert!(client.consume_waiver(&first));
    // Consuming `first` must not touch `second`.
    assert!(!client.has_waiver(&first));
    assert!(client.has_waiver(&second));
    assert!(client.consume_waiver(&second));
}
