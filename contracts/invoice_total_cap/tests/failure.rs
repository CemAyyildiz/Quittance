//! Failure and authorization integration tests.

use invoice_total_cap::{CapError, InvoiceTotalCap, InvoiceTotalCapClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn deployed() -> (Env, InvoiceTotalCapClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(InvoiceTotalCap, ());
    let client = InvoiceTotalCapClient::new(&env, &contract_id);
    (env, client, admin)
}

fn initialized(cap: i128) -> (Env, InvoiceTotalCapClient<'static>, Address, Address) {
    let (env, client, admin) = deployed();
    let seller = Address::generate(&env);
    client
        .try_initialize(&admin, &cap)
        .expect("initialize should succeed")
        .expect("contract should accept initialization");
    (env, client, admin, seller)
}

#[test]
fn initialize_twice_is_rejected() {
    let (_env, client, admin) = deployed();
    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should succeed")
        .expect("contract should accept initialization");

    let outer = client
        .try_initialize(&admin, &2_000)
        .expect_err("second initialize must fail");
    assert_eq!(outer, Ok(CapError::AlreadyInitialized));
    assert_eq!(client.cap(), 1_000);
}

#[test]
fn negative_cap_is_rejected_on_initialize_and_update() {
    let (_env, client, admin) = deployed();

    let outer = client
        .try_initialize(&admin, &-5)
        .expect_err("negative initial cap must fail");
    assert_eq!(outer, Ok(CapError::InvalidCap));

    client
        .try_initialize(&admin, &1_000)
        .expect("initialize should succeed")
        .expect("contract should accept initialization");

    let outer = client
        .try_set_cap(&admin, &-5)
        .expect_err("negative updated cap must fail");
    assert_eq!(outer, Ok(CapError::InvalidCap));
    assert_eq!(client.cap(), 1_000);
}

#[test]
fn non_admin_cannot_set_the_cap() {
    let (env, client, _admin, _seller) = initialized(1_000);
    let impostor = Address::generate(&env);

    let outer = client
        .try_set_cap(&impostor, &2_000)
        .expect_err("non-admin update must fail");
    assert_eq!(outer, Ok(CapError::Unauthorized));
    assert_eq!(client.cap(), 1_000);
}

#[test]
fn uninitialized_contract_rejects_stateful_calls() {
    let (env, client, _admin) = deployed();
    let seller = Address::generate(&env);

    let outer = client
        .try_record_invoice(&seller, &1)
        .expect_err("record before initialize must fail");
    assert_eq!(outer, Ok(CapError::NotInitialized));

    let outer = client
        .try_remaining_for(&seller)
        .expect_err("remaining query before initialize must fail");
    assert_eq!(outer, Ok(CapError::NotInitialized));
}

#[test]
fn failed_invoice_does_not_change_the_running_total() {
    let (_env, client, _admin, seller) = initialized(1_000);
    client
        .try_record_invoice(&seller, &600)
        .expect("invocation should succeed")
        .expect("first invoice should be accepted");

    let outer = client
        .try_record_invoice(&seller, &500)
        .expect_err("over-cap invoice must fail");
    assert_eq!(outer, Ok(CapError::CapExceeded));

    assert_eq!(client.running_total(&seller), 600);
    let remaining = client
        .try_remaining_for(&seller)
        .expect("invocation should succeed")
        .expect("remaining query should succeed");
    assert_eq!(remaining, 400);
}
