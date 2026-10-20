//! Unit tests for the contract's storage-backed paths and the pure helpers.

use crate::{CapError, InvoiceTotalCap, InvoiceTotalCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, InvoiceTotalCapClient<'static>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let contract_id = env.register(InvoiceTotalCap, ());
    let client = InvoiceTotalCapClient::new(&env, &contract_id);
    (env, client, admin, seller)
}

#[test]
fn initialize_stores_admin_and_cap() {
    let (_env, client, admin, _seller) = setup();

    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");

    assert_eq!(client.cap(), 1_000);
}

#[test]
fn second_initialize_is_rejected() {
    let (_env, client, admin, _seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");

    let outer = client
        .try_initialize(&admin, &2_000)
        .expect_err("second initialize must fail");
    assert_eq!(outer, Ok(CapError::AlreadyInitialized));
}

#[test]
fn negative_initial_cap_is_rejected() {
    let (_env, client, admin, _seller) = setup();

    let outer = client
        .try_initialize(&admin, &-1)
        .expect_err("negative cap must fail");
    assert_eq!(outer, Ok(CapError::InvalidCap));
}

#[test]
fn record_invoice_updates_running_total() {
    let (_env, client, admin, seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");

    let first = client
        .try_record_invoice(&seller, &400)
        .expect("first invoice should succeed")
        .expect("contract should accept the invoice");
    assert_eq!(first, 400);

    let second = client
        .try_record_invoice(&seller, &600)
        .expect("second invoice should succeed")
        .expect("contract should accept the invoice");
    assert_eq!(second, 1_000);

    assert_eq!(client.running_total(&seller), 1_000);
}

#[test]
fn record_invoice_over_cap_is_rejected() {
    let (_env, client, admin, seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");

    let outer = client
        .try_record_invoice(&seller, &1_001)
        .expect_err("over-cap invoice must fail");
    assert_eq!(outer, Ok(CapError::CapExceeded));
    assert_eq!(client.running_total(&seller), 0);
}

#[test]
fn record_invoice_rejects_zero_and_negative_amounts() {
    let (_env, client, admin, seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");

    for amount in [0_i128, -1] {
        let outer = client
            .try_record_invoice(&seller, &amount)
            .expect_err("non-positive amount must fail");
        assert_eq!(outer, Ok(CapError::InvalidAmount));
    }
}

#[test]
fn calls_before_initialize_fail_with_not_initialized() {
    let (_env, client, _admin, seller) = setup();

    let outer = client
        .try_record_invoice(&seller, &1)
        .expect_err("record before initialize must fail");
    assert_eq!(outer, Ok(CapError::NotInitialized));

    let outer = client
        .try_would_exceed_cap_for(&seller, &1)
        .expect_err("query before initialize must fail");
    assert_eq!(outer, Ok(CapError::NotInitialized));

    let outer = client
        .try_remaining_for(&seller)
        .expect_err("capacity query before initialize must fail");
    assert_eq!(outer, Ok(CapError::NotInitialized));
}

#[test]
fn non_admin_cannot_change_cap() {
    let (env, client, admin, _seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");
    let impostor = Address::generate(&env);

    let outer = client
        .try_set_cap(&impostor, &2_000)
        .expect_err("non-admin set_cap must fail");
    assert_eq!(outer, Ok(CapError::Unauthorized));
    assert_eq!(client.cap(), 1_000);
}

#[test]
fn stateful_query_matches_pure_predicate() {
    let (_env, client, admin, seller) = setup();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should be callable once")
        .expect("contract should accept initialization");
    client
        .try_record_invoice(&seller, &400)
        .expect("invoice should succeed")
        .expect("contract should accept the invoice");

    let under = client
        .try_would_exceed_cap_for(&seller, &600)
        .expect("query should succeed")
        .expect("query should return a boolean");
    assert!(!under);

    let over = client
        .try_would_exceed_cap_for(&seller, &601)
        .expect("query should succeed")
        .expect("query should return a boolean");
    assert!(over);

    let remaining = client
        .try_remaining_for(&seller)
        .expect("remaining query should succeed")
        .expect("remaining query should return a value");
    assert_eq!(remaining, 600);
}

#[test]
fn contract_predicate_matches_free_function() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let contract_id = env.register(InvoiceTotalCap, ());
    let client = InvoiceTotalCapClient::new(&env, &contract_id);

    for (running, incoming, cap) in [
        (0_i128, 1_i128, 1_i128),
        (400, 600, 1_000),
        (400, 601, 1_000),
        (i128::MAX, 1, i128::MAX),
    ] {
        let actual = client
            .try_would_exceed_cap(&seller, &running, &incoming, &cap)
            .expect("predicate call should succeed")
            .expect("predicate should return a boolean");
        assert_eq!(actual, crate::would_exceed_cap(running, incoming, cap));
    }
}
