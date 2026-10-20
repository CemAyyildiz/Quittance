//! Unit tests for the commit-reveal contract and the pure hash helper.

use crate::{memo_hash, MemoCommitReveal, MemoCommitRevealClient};
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
fn commit_and_reveal_round_trip() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");

    assert!(client.commit(&hash));
    assert!(client.is_committed(&hash));
    assert_eq!(client.pending_count(), 1);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);

    assert!(!client.is_committed(&hash));
    assert_eq!(client.pending_count(), 0);
}

#[test]
fn on_chain_digest_matches_the_off_chain_helper() {
    let (env, client) = setup();
    let memo = String::from_str(&env, "INV-42");
    let hash = hash_of(&env, "INV-42");

    client.commit(&hash);

    let revealed = client
        .try_reveal(&memo)
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);
}

#[test]
fn committing_the_same_hash_twice_is_idempotent() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");

    assert!(client.commit(&hash));
    assert!(!client.commit(&hash));
    assert_eq!(client.pending_count(), 1);
}

#[test]
fn cancelling_removes_a_pending_commitment() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");

    client.commit(&hash);
    assert!(client.cancel(&hash));
    assert!(!client.is_committed(&hash));
    assert_eq!(client.pending_count(), 0);
    assert!(!client.cancel(&hash));
}

#[test]
fn oversized_memos_are_rejected() {
    let (env, client) = setup();
    let long = "a".repeat(crate::MAX_MEMO_BYTES as usize + 1);

    let outer = client
        .try_reveal(&String::from_str(&env, &long))
        .expect_err("oversized memo must fail");
    assert_eq!(outer, Ok(crate::Error::MemoTooLong));
}
