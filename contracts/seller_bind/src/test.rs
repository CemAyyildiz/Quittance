#![cfg(test)]

//! Unit tests for the `seller-bind` Soroban contract.
//!
//! Covers the acceptance criteria:
//! - match returns `Ok(())`
//! - mismatch returns a clear `Error::SellerMismatch`
//! - calling `check_seller`, `set_seller`, or `get_seller` before
//!   initialization returns `Error::NotInitialized`
//! - `get_seller` / `set_seller` roundtrip the binding correctly.
//!
//! All fallible calls go through the generated `try_*` client methods
//! so we can assert on the contract's `Result<T, Error>` directly. The
//! outer `Result` is per-invocation success / failure and the inner
//! `Result` distinguishes our custom error (`Ok(_)`) from VM-level
//! errors (`Err(_)`).

use crate::{Error, SellerBind, SellerBindClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn check_seller_returns_ok_on_match() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    client.init(&seller);

    let outer = client
        .try_check_seller(&seller)
        .expect("match call should not error at the invocation level");
    assert!(
        matches!(outer, Ok(())),
        "expected Ok(()) on match, got {:?}",
        outer
    );
}

#[test]
fn check_seller_returns_seller_mismatch_on_mismatch() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let other = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    client.init(&seller);

    let outer = client
        .try_check_seller(&other)
        .expect_err("mismatch should surface as an invocation-level error");
    let inner = outer.expect("expected our custom error variant, not a VM error");
    assert_eq!(inner, Error::SellerMismatch);
}

#[test]
fn check_seller_returns_not_initialized_before_init() {
    let env = Env::default();
    let other = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    // intentionally do not call `init` here.
    let outer = client
        .try_check_seller(&other)
        .expect_err("pre-init call should surface as an invocation-level error");
    let inner = outer.expect("expected our custom error variant, not a VM error");
    assert_eq!(inner, Error::NotInitialized);
}

#[test]
fn set_seller_returns_not_initialized_before_init() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    // intentionally do not call `init` here.
    let outer = client
        .try_set_seller(&seller)
        .expect_err("pre-init call should surface as an invocation-level error");
    let inner = outer.expect("expected our custom error variant, not a VM error");
    assert_eq!(inner, Error::NotInitialized);
}

#[test]
fn get_seller_returns_not_initialized_before_init() {
    let env = Env::default();
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    // intentionally do not call `init` here.
    let outer = client
        .try_get_seller()
        .expect_err("pre-init call should surface as an invocation-level error");
    let inner = outer.expect("expected our custom error variant, not a VM error");
    assert_eq!(inner, Error::NotInitialized);
}

#[test]
fn get_seller_returns_bound_address() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    client.init(&seller);

    let outer = client
        .try_get_seller()
        .expect("get_seller should not error after init");
    assert!(matches!(&outer, Ok(addr) if addr == &seller));
}

#[test]
fn set_seller_replaces_binding() {
    let env = Env::default();
    let seller = Address::generate(&env);
    let next = Address::generate(&env);
    let contract_id = env.register(SellerBind, ());
    let client = SellerBindClient::new(&env, &contract_id);

    client.init(&seller);

    let outer = client
        .try_set_seller(&next)
        .expect("set_seller should not error after init");
    assert!(
        matches!(outer, Ok(())),
        "expected Ok(()) on replace, got {:?}",
        outer
    );

    // New binding passes.
    let outer_match = client
        .try_check_seller(&next)
        .expect("check_seller should not error after rebind");
    assert!(
        matches!(outer_match, Ok(())),
        "expected Ok(()) for new binding, got {:?}",
        outer_match
    );

    // Old binding now fails with SellerMismatch.
    let outer_mismatch = client
        .try_check_seller(&seller)
        .expect_err("old binding should no longer match");
    let inner = outer_mismatch.expect("expected our custom error variant");
    assert_eq!(inner, Error::SellerMismatch);
}
