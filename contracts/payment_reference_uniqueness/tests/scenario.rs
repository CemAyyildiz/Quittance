//! Scenario tests: the registry behaves like a global idempotency key.

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
fn the_registry_is_global_across_callers() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_1");

    // The first payer claims the reference.
    assert!(client.claim_reference(&invoice));

    // A later payer — a different transaction, a different contract, a
    // different account — cannot claim the same reference.
    let outer = client
        .try_claim_reference_checked(&invoice)
        .expect_err("the second claim must fail");
    assert_eq!(outer, Ok(Error::AlreadyClaimed));
    assert_eq!(client.claimed_count(), 1);
}

#[test]
fn claims_survive_interleaved_claims_of_other_references() {
    let (env, client) = setup();
    let first = Symbol::new(&env, "INV_1");
    let second = Symbol::new(&env, "INV_2");
    let third = Symbol::new(&env, "INV_3");

    assert!(client.claim_reference(&first));
    assert!(client.claim_reference(&second));
    assert!(!client.claim_reference(&first));
    assert!(client.claim_reference(&third));

    assert_eq!(client.claimed_count(), 3);
    assert!(client.is_claimed(&first));
    assert!(client.is_claimed(&second));
    assert!(client.is_claimed(&third));
}

#[test]
fn a_reference_is_claimed_exactly_once_under_repeated_attempts() {
    let (env, client) = setup();
    let invoice = Symbol::new(&env, "INV_RETRY");

    let mut first_claim = false;
    for _ in 0..5 {
        let claimed = client.claim_reference(&invoice);
        if !first_claim {
            assert!(claimed);
            first_claim = true;
        } else {
            assert!(!claimed);
        }
    }

    assert_eq!(client.claimed_count(), 1);
}
