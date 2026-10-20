//! Scenario tests: the commit-reveal lifecycle across several payers.

use memo_commit_reveal::{memo_hash, MemoCommitReveal, MemoCommitRevealClient};
use soroban_sdk::{BytesN, Env, String};

fn setup() -> (Env, MemoCommitRevealClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(MemoCommitReveal, ());
    let client = MemoCommitRevealClient::new(&env, &contract_id);
    (env, client)
}

fn hash_of(env: &Env, memo: &str) -> BytesN<32> {
    BytesN::from_array(env, &memo_hash(memo.as_bytes()))
}

#[test]
fn commitments_can_be_revealed_out_of_order() {
    let (env, client) = setup();
    let alice = hash_of(&env, "ALICE-INV-1");
    let bob = hash_of(&env, "BOB-INV-1");

    client.commit(&alice);
    client.commit(&bob);
    assert_eq!(client.pending_count(), 2);

    // Bob reveals first; Alice's commitment is unaffected.
    let revealed = client
        .try_reveal(&String::from_str(&env, "BOB-INV-1"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);
    assert!(client.is_committed(&alice));

    let revealed = client
        .try_reveal(&String::from_str(&env, "ALICE-INV-1"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);
    assert_eq!(client.pending_count(), 0);
}

#[test]
fn a_cancelled_commitment_can_never_be_revealed() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");
    client.commit(&hash);

    assert!(client.cancel(&hash));
    assert!(!client.is_committed(&hash));

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(!revealed);
    assert_eq!(client.pending_count(), 0);
}

#[test]
fn a_memo_only_reveals_the_commitment_it_matches() {
    let (env, client) = setup();
    let committed = hash_of(&env, "INV-42");
    let other = hash_of(&env, "INV-99");

    client.commit(&committed);
    client.commit(&other);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);

    // Only the matching commitment was consumed.
    assert!(!client.is_committed(&committed));
    assert!(client.is_committed(&other));
    assert_eq!(client.pending_count(), 1);
}
