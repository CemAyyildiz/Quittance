//! Boundary and edge-case integration tests for memo hashing.

use memo_commit_reveal::{memo_hash, MemoCommitReveal, MemoCommitRevealClient, MAX_MEMO_BYTES};
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
fn an_empty_memo_can_be_committed_and_revealed() {
    let (env, client) = setup();
    let hash = hash_of(&env, "");

    assert!(client.commit(&hash));
    let revealed = client
        .try_reveal(&String::from_str(&env, ""))
        .expect("invocation should succeed")
        .expect("an empty memo is within the length limit");
    assert!(revealed);
}

#[test]
fn a_memo_of_exactly_the_maximum_length_is_accepted() {
    let (env, client) = setup();
    let memo = "a".repeat(MAX_MEMO_BYTES as usize);
    let hash = hash_of(&env, &memo);

    assert!(client.commit(&hash));
    let revealed = client
        .try_reveal(&String::from_str(&env, &memo))
        .expect("invocation should succeed")
        .expect("a maximum-length memo is accepted");
    assert!(revealed);
}

#[test]
fn a_memo_one_byte_over_the_maximum_is_rejected() {
    let (env, client) = setup();
    let memo = "a".repeat(MAX_MEMO_BYTES as usize + 1);

    let outer = client
        .try_reveal(&String::from_str(&env, &memo))
        .expect_err("an oversized memo must fail");
    assert_eq!(outer, Ok(memo_commit_reveal::Error::MemoTooLong));
}

#[test]
fn an_all_zero_hash_can_be_committed_but_never_revealed() {
    let (env, client) = setup();
    let zero = BytesN::from_array(&env, &[0u8; 32]);

    assert!(client.commit(&zero));
    assert!(client.is_committed(&zero));

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(!revealed);

    // The commitment is untouched by a failed reveal.
    assert!(client.is_committed(&zero));
}

#[test]
fn the_pending_count_tracks_every_state_change() {
    let (env, client) = setup();
    let first = hash_of(&env, "INV-1");
    let second = hash_of(&env, "INV-2");

    assert_eq!(client.pending_count(), 0);

    client.commit(&first);
    assert_eq!(client.pending_count(), 1);

    client.commit(&second);
    assert_eq!(client.pending_count(), 2);

    client.cancel(&first);
    assert_eq!(client.pending_count(), 1);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-2"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);
    assert_eq!(client.pending_count(), 0);
}
