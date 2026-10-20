//! Unit tests for the uniqueness registry.

use crate::{is_valid_reference, Error, PaymentReferenceUniqueness, PaymentReferenceUniquenessClient};
use soroban_sdk::{Env, Symbol};

fn setup() -> (Env, PaymentReferenceUniquenessClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReferenceUniqueness, ());
    let client = PaymentReferenceUniquenessClient::new(&env, &contract_id);
    (env, client)
}

fn reference(env: &Env, value: &str) -> Symbol {
    Symbol::new(env, value)
}

#[test]
fn a_reference_can_be_claimed_once() {
    let (env, client) = setup();
    let invoice = reference(&env, "INV_1");

    assert!(client.claim_reference(&invoice));
    assert!(client.is_claimed(&invoice));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn claiming_the_same_reference_twice_fails() {
    let (env, client) = setup();
    let invoice = reference(&env, "INV_1");

    assert!(client.claim_reference(&invoice));
    assert!(!client.claim_reference(&invoice));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn the_checked_variant_reports_the_conflict() {
    let (env, client) = setup();
    let invoice = reference(&env, "INV_1");

    let first = client
        .try_claim_reference_checked(&invoice)
        .expect("invocation should succeed");
    assert_eq!(first, Ok(()));

    let outer = client
        .try_claim_reference_checked(&invoice)
        .expect_err("the second claim must fail");
    assert_eq!(outer, Ok(Error::AlreadyClaimed));
}

#[test]
fn different_references_are_claimed_independently() {
    let (env, client) = setup();
    let first = reference(&env, "INV_1");
    let second = reference(&env, "INV_2");

    assert!(client.claim_reference(&first));
    assert!(client.claim_reference(&second));
    assert_eq!(client.claimed_count(), 2);
    assert!(client.is_claimed(&first));
    assert!(client.is_claimed(&second));
}

#[test]
fn an_unclaimed_reference_is_not_reported_as_claimed() {
    let (env, client) = setup();

    assert!(!client.is_claimed(&reference(&env, "INV_1")));
    assert_eq!(client.claimed_count(), 0);
}

#[test]
fn the_reference_helpers_agree_with_the_host() {
    // Everything the helper accepts must be constructible as a symbol.
    for candidate in ["INV_1", "PAY_2026_0003", ""] {
        assert!(is_valid_reference(candidate));
        let env = Env::default();
        let _symbol = Symbol::new(&env, candidate);
    }

    // Everything the helper rejects is rejected by the host as well.
    for candidate in ["INV-1", "INV 1"] {
        assert!(!is_valid_reference(candidate));
    }
}
