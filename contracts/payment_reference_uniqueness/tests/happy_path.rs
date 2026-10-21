//! Happy-path integration tests: claiming references for the first time.

use payment_reference_uniqueness::{PaymentReferenceUniqueness, PaymentReferenceUniquenessClient};
use soroban_sdk::{Env, Symbol};

fn setup() -> (Env, PaymentReferenceUniquenessClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(PaymentReferenceUniqueness, ());
    let client = PaymentReferenceUniquenessClient::new(&env, &contract_id);
    (env, client)
}

#[test]
fn a_fresh_reference_is_claimed() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");

    assert!(client.claim_reference(&invoice));
    assert!(client.is_claimed(&invoice));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn several_references_are_claimed_independently() {
    let (env, client) = setup();
    let first = Symbol::new(&env, "INV_1");
    let second = Symbol::new(&env, "INV_2");
    let third = Symbol::new(&env, "PAY_2026_0003");

    assert!(client.claim_reference(&first));
    assert!(client.claim_reference(&second));
    assert!(client.claim_reference(&third));

    assert_eq!(client.claimed_count(), 3);
    assert!(client.is_claimed(&first));
    assert!(client.is_claimed(&second));
    assert!(client.is_claimed(&third));
}

#[test]
fn the_checked_variant_accepts_a_fresh_reference() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");

    let claimed = client
        .try_claim_reference_checked(&invoice)
        .expect("invocation should succeed");
    assert_eq!(claimed, Ok(()));
    assert!(client.is_claimed(&invoice));
}
