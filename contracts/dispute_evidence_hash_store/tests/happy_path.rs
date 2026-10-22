mod common;

use common::{client, hash, setup};

#[test]
fn stores_and_returns_a_committed_hash() {
    let (env, contract_id, dispute_id) = setup();
    let client = client(&env, &contract_id);
    let expected = hash(&env, 0x5a);

    assert_eq!(client.evidence_hash(&dispute_id), None);
    client.commit_evidence(&dispute_id, &expected);

    assert_eq!(client.evidence_hash(&dispute_id), Some(expected));
}