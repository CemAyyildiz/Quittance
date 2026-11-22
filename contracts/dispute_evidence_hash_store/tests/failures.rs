mod common;

use common::{client, hash, setup};
use dispute_evidence_hash_store::Error;

#[test]
fn rejects_a_second_commit_without_changing_the_original_hash() {
    let (env, contract_id, dispute_id) = setup();
    let client = client(&env, &contract_id);
    let original = hash(&env, 0x11);

    client.commit_evidence(&dispute_id, &original);

    assert_eq!(
        client.try_commit_evidence(&dispute_id, &hash(&env, 0x22)),
        Err(Ok(Error::AlreadyCommitted))
    );
    assert_eq!(client.evidence_hash(&dispute_id), Some(original));
}