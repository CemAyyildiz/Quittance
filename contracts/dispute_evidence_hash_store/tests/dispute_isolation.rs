mod common;

use common::{client, hash, setup};
use soroban_sdk::Symbol;

#[test]
fn commitments_are_independent_between_disputes() {
    let (env, contract_id, first_id) = setup();
    let second_id = Symbol::new(&env, "dispute_2");
    let client = client(&env, &contract_id);
    let first_hash = hash(&env, 0x31);
    let second_hash = hash(&env, 0x32);

    client.commit_evidence(&first_id, &first_hash);
    client.commit_evidence(&second_id, &second_hash);

    assert_eq!(client.evidence_hash(&first_id), Some(first_hash));
    assert_eq!(client.evidence_hash(&second_id), Some(second_hash));
}