//! Happy-path integration tests: configure a cap and record invoices that
//! stay within it.

use invoice_total_cap::{InvoiceTotalCap, InvoiceTotalCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(cap: i128) -> (Env, InvoiceTotalCapClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let contract_id = env.register(InvoiceTotalCap, ());
    let client = InvoiceTotalCapClient::new(&env, &contract_id);
    client
        .try_initialize(&admin, &cap)
        .expect("initialize should succeed")
        .expect("contract should accept initialization");
    (env, client, admin, seller)
}

#[test]
fn records_invoices_under_the_cap() {
    let (_env, client, _admin, seller) = setup(1_000);

    let first = client
        .try_record_invoice(&seller, &250)
        .expect("invocation should succeed")
        .expect("invoice should be accepted");
    assert_eq!(first, 250);

    let second = client
        .try_record_invoice(&seller, &500)
        .expect("invocation should succeed")
        .expect("invoice should be accepted");
    assert_eq!(second, 750);

    assert_eq!(client.running_total(&seller), 750);

    let remaining = client
        .try_remaining_for(&seller)
        .expect("invocation should succeed")
        .expect("remaining capacity should be available");
    assert_eq!(remaining, 250);
}

#[test]
fn stateful_predicate_agrees_with_recorded_total() {
    let (_env, client, _admin, seller) = setup(1_000);
    client
        .try_record_invoice(&seller, &400)
        .expect("invocation should succeed")
        .expect("invoice should be accepted");

    let fits = client
        .try_would_exceed_cap_for(&seller, &600)
        .expect("invocation should succeed")
        .expect("query should return a boolean");
    assert!(!fits);

    let does_not_fit = client
        .try_would_exceed_cap_for(&seller, &601)
        .expect("invocation should succeed")
        .expect("query should return a boolean");
    assert!(does_not_fit);
}

#[test]
fn pure_predicate_is_callable_through_the_contract() {
    let (_env, client, _admin, seller) = setup(1_000);

    // The pure predicate is exported as a contract entry point as well, which
    // lets off-chain simulators evaluate it without reading storage first.
    assert!(!client.would_exceed_cap(&seller, &400, &600, &1_000));
    assert!(client.would_exceed_cap(&seller, &400, &601, &1_000));
}
