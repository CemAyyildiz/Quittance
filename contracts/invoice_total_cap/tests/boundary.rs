//! Boundary and edge-case integration tests for the cap arithmetic.

use invoice_total_cap::{CapError, InvoiceTotalCap, InvoiceTotalCapClient};
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
fn an_invoice_that_lands_exactly_on_the_cap_is_allowed() {
    let (_env, client, _admin, seller) = setup(1_000);

    let total = client
        .try_record_invoice(&seller, &1_000)
        .expect("invocation should succeed")
        .expect("exact-cap invoice should be accepted");
    assert_eq!(total, 1_000);

    let remaining = client
        .try_remaining_for(&seller)
        .expect("invocation should succeed")
        .expect("remaining capacity should be available");
    assert_eq!(remaining, 0);
}

#[test]
fn one_unit_over_the_cap_is_rejected() {
    let (_env, client, _admin, seller) = setup(1_000);

    let outer = client
        .try_record_invoice(&seller, &1_001)
        .expect_err("over-cap invoice must fail");
    assert_eq!(outer, Ok(CapError::CapExceeded));
    assert_eq!(client.running_total(&seller), 0);
}

#[test]
fn zero_cap_rejects_every_positive_invoice() {
    let (_env, client, _admin, seller) = setup(0);

    let outer = client
        .try_record_invoice(&seller, &1)
        .expect_err("positive invoice under zero cap must fail");
    assert_eq!(outer, Ok(CapError::CapExceeded));

    let remaining = client
        .try_remaining_for(&seller)
        .expect("invocation should succeed")
        .expect("remaining capacity should be available");
    assert_eq!(remaining, 0);
}

#[test]
fn i128_overflow_is_reported_as_overflow() {
    let (_env, client, _admin, seller) = setup(i128::MAX);

    client
        .try_record_invoice(&seller, &i128::MAX)
        .expect("invocation should succeed")
        .expect("max amount should fit under max cap");

    let outer = client
        .try_record_invoice(&seller, &1)
        .expect_err("adding one more unit must overflow");
    assert_eq!(outer, Ok(CapError::Overflow));
    assert_eq!(client.running_total(&seller), i128::MAX);
}

#[test]
fn lowering_the_cap_only_affects_future_invoices() {
    let (_env, client, admin, seller) = setup(1_000);
    client
        .try_record_invoice(&seller, &800)
        .expect("invocation should succeed")
        .expect("invoice should be accepted");

    client
        .try_set_cap(&admin, &500)
        .expect("invocation should succeed")
        .expect("admin should be able to lower the cap");

    assert_eq!(client.running_total(&seller), 800);
    let remaining = client
        .try_remaining_for(&seller)
        .expect("invocation should succeed")
        .expect("remaining query should succeed");
    assert_eq!(remaining, 0);

    let outer = client
        .try_record_invoice(&seller, &1)
        .expect_err("invoice above the lowered cap must fail");
    assert_eq!(outer, Ok(CapError::CapExceeded));
}

#[test]
fn zero_amount_is_rejected_even_when_capacity_remains() {
    let (_env, client, _admin, seller) = setup(1_000);

    let outer = client
        .try_record_invoice(&seller, &0)
        .expect_err("zero invoice must fail");
    assert_eq!(outer, Ok(CapError::InvalidAmount));
}
