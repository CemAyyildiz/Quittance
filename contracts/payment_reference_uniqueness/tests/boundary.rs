//! Boundary and edge-case integration tests for reference strings.

use payment_reference_uniqueness::{PaymentReferenceUniqueness, PaymentReferenceUniquenessClient};
use soroban_sdk::{Env, Symbol};

fn setup() -> (Env, PaymentReferenceUniquenessClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReferenceUniqueness, ());
    let client = PaymentReferenceUniquenessClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_maximum_length_reference_is_claimable() {
    let (env, client) = setup();
    // A Soroban symbol holds at most 32 characters.
    let reference = Symbol::new(&env, &"a".repeat(32));

    assert!(client.claim_reference(&reference));
    assert!(client.is_claimed(&reference));
}

#[test]
fn an_empty_reference_is_still_a_reference() {
    let (env, client) = setup();
    let reference = Symbol::new(&env, "");

    assert!(client.claim_reference(&reference));
    assert!(client.is_claimed(&reference));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn references_are_case_sensitive() {
    let (env, client) = setup();
    let upper = Symbol::new(&env, "INV_1");
    let lower = Symbol::new(&env, "inv_1");

    assert!(client.claim_reference(&upper));
    assert!(client.claim_reference(&lower));
    assert_eq!(client.claimed_count(), 2);
}

#[test]
fn underscores_are_part_of_the_reference() {
    let (env, client) = setup();
    let with_underscore = Symbol::new(&env, "INV_1");
    let without = Symbol::new(&env, "INV1");

    assert!(client.claim_reference(&with_underscore));
    assert!(client.claim_reference(&without));
    assert_eq!(client.claimed_count(), 2);
}

#[test]
#[should_panic]
fn a_reference_longer_than_a_symbol_is_rejected_by_the_host() {
    let env = Env::default();
    let _contract_id = env.register(PaymentReferenceUniqueness, ());
    // A Soroban symbol holds at most 32 characters, so a longer reference
    // cannot even be constructed.
    let _too_long = Symbol::new(&env, &"a".repeat(33));
}
