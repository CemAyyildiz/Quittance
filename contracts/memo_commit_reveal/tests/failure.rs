//! Failure-mode integration tests.

use memo_commit_reveal::{memo_hash, Error, MemoCommitReveal, MemoCommitRevealClient};
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
fn revealing_without_a_commitment_fails_softly() {
    let (env, client) = setup();

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(!revealed);
    assert_eq!(client.pending_count(), 0);
}

#[test]
fn a_wrong_memo_does_not_consume_the_commitment() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");
    client.commit(&hash);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-43"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(!revealed);

    // The commitment survives the failed reveal and can still be redeemed.
    assert!(client.is_committed(&hash));
    assert_eq!(client.pending_count(), 1);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);
}

#[test]
fn committing_the_same_hash_twice_is_rejected() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");

    assert!(client.commit(&hash));
    assert!(!client.commit(&hash));
    assert_eq!(client.pending_count(), 1);
}

#[test]
fn cancelling_an_unknown_hash_is_a_no_op() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");

    assert!(!client.cancel(&hash));
    assert_eq!(client.pending_count(), 0);
}

#[test]
fn an_oversized_memo_returns_an_error() {
    let (env, client) = setup();
    let long = "a".repeat(memo_commit_reveal::MAX_MEMO_BYTES as usize + 1);

    let outer = client
        .try_reveal(&String::from_str(&env, &long))
        .expect_err("an oversized memo must fail");
    assert_eq!(outer, Ok(Error::MemoTooLong));
}
