//! Happy-path integration tests: commit a memo hash, then reveal the memo.

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
fn a_matching_memo_reveals_the_commitment() {
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
fn a_revealed_commitment_cannot_be_replayed() {
    let (env, client) = setup();
    let hash = hash_of(&env, "INV-42");
    client.commit(&hash);

    let first = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(first);

    let second = client
        .try_reveal(&String::from_str(&env, "INV-42"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(!second);
}

#[test]
fn several_commitments_can_be_pending_at_once() {
    let (env, client) = setup();
    let first = hash_of(&env, "INV-1");
    let second = hash_of(&env, "INV-2");

    assert!(client.commit(&first));
    assert!(client.commit(&second));
    assert_eq!(client.pending_count(), 2);

    let revealed = client
        .try_reveal(&String::from_str(&env, "INV-2"))
        .expect("invocation should succeed")
        .expect("memo should be within the length limit");
    assert!(revealed);

    assert!(client.is_committed(&first));
    assert!(!client.is_committed(&second));
    assert_eq!(client.pending_count(), 1);
}
