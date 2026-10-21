//! Scenario tests: per-seller isolation and admin-driven cap changes.

use invoice_total_cap::{CapError, InvoiceTotalCap, InvoiceTotalCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(cap: i128) -> (Env, InvoiceTotalCapClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let contract_id = env.register(InvoiceTotalCap, ());
    let client = InvoiceTotalCapClient::new(&env, &contract_id);
    client
        .try_initialize(&admin, &cap)
        .expect("initialize should succeed")
        .expect("contract should accept initialization");
    (env, client, admin, alice, bob)
}

#[test]
fn sellers_have_independent_running_totals() {
    let (_env, client, _admin, alice, bob) = setup(1_000);

    client
        .try_record_invoice(&alice, &900)
        .expect("invocation should succeed")
        .expect("alice invoice should be accepted");
    client
        .try_record_invoice(&bob, &900)
        .expect("invocation should succeed")
        .expect("bob invoice should be accepted");

    assert_eq!(client.running_total(&alice), 900);
    assert_eq!(client.running_total(&bob), 900);

    // Alice is nearly exhausted, but Bob still has his own full capacity left.
    let alice_over = client
        .try_record_invoice(&alice, &101)
        .expect_err("alice is over her cap");
    assert_eq!(alice_over, Ok(CapError::CapExceeded));

    let bob_total = client
        .try_record_invoice(&bob, &100)
        .expect("invocation should succeed")
        .expect("bob still has capacity");
    assert_eq!(bob_total, 1_000);
}

#[test]
fn admin_can_raise_the_cap_to_admit_more_invoices() {
    let (_env, client, admin, alice, _bob) = setup(1_000);
    client
        .try_record_invoice(&alice, &1_000)
        .expect("invocation should succeed")
        .expect("alice invoice should fill the cap");

    let blocked = client
        .try_record_invoice(&alice, &1)
        .expect_err("cap is exhausted");
    assert_eq!(blocked, Ok(CapError::CapExceeded));

    client
        .try_set_cap(&admin, &1_500)
        .expect("invocation should succeed")
        .expect("admin can raise the cap");

    let total = client
        .try_record_invoice(&alice, &500)
        .expect("invocation should succeed")
        .expect("raised cap admits the invoice");
    assert_eq!(total, 1_500);

    let remaining = client
        .try_remaining_for(&alice)
        .expect("invocation should succeed")
        .expect("remaining query should succeed");
    assert_eq!(remaining, 0);
}

#[test]
fn new_seller_starts_with_a_zero_total() {
    let (env, client, _admin, _alice, _bob) = setup(1_000);
    let newcomer = Address::generate(&env);

    assert_eq!(client.running_total(&newcomer), 0);
    let remaining = client
        .try_remaining_for(&newcomer)
        .expect("invocation should succeed")
        .expect("remaining query should succeed");
    assert_eq!(remaining, 1_000);
}
