//! Failure-mode integration tests: duplicate claims and conflict reporting.

use payment_reference_uniqueness::{
    Error, PaymentReferenceUniqueness, PaymentReferenceUniquenessClient,
};
use soroban_sdk::{Env, Symbol};

fn setup() -> (Env, PaymentReferenceUniquenessClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReferenceUniqueness, ());
    let client = PaymentReferenceUniquenessClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_duplicate_claim_is_rejected() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");

    assert!(client.claim_reference(&invoice));
    assert!(!client.claim_reference(&invoice));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn the_checked_variant_reports_the_conflict() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");

    client
        .try_claim_reference_checked(&invoice)
        .expect("invocation should succeed")
        .expect("the first claim should succeed");

    let outer = client
        .try_claim_reference_checked(&invoice)
        .expect_err("the second claim must fail");
    assert_eq!(outer, Ok(Error::AlreadyClaimed));
}

#[test]
fn a_failed_claim_does_not_change_the_registry() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");
    client.claim_reference(&invoice);

    assert!(!client.claim_reference(&invoice));

    assert_eq!(client.claimed_count(), 1);
    assert!(client.is_claimed(&invoice));
}

#[test]
fn an_unclaimed_reference_is_not_reported_as_claimed() {
    let (env, client) = setup();

    assert!(!client.is_claimed(&Symbol::new(&env, "INV_1")));
    assert_eq!(client.claimed_count(), 0);
}
