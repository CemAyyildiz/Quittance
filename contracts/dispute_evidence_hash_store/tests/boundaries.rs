mod common;

use common::{client, hash, setup};
use soroban_sdk::Symbol;

#[test]
fn stores_boundary_hash_values_and_short_dispute_ids() {
    let (env, contract_id, _) = setup();
    let client = client(&env, &contract_id);
    let short_id = Symbol::new(&env, "d");
    let zero_hash = hash(&env, 0x00);
    let max_hash = hash(&env, 0xff);

    client.commit_evidence(&short_id, &zero_hash);
    client.commit_evidence(&Symbol::new(&env, "dispute_max_hash"), &max_hash);

    assert_eq!(client.evidence_hash(&short_id), Some(zero_hash));
    assert_eq!(
        client.evidence_hash(&Symbol::new(&env, "dispute_max_hash")),
        Some(max_hash)
    );
}