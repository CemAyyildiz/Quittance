use dispute_evidence_hash_store::{DisputeEvidenceHashStore, DisputeEvidenceHashStoreClient};
use soroban_sdk::{Address, BytesN, Env, Symbol};

pub fn setup() -> (Env, Address, Symbol) {
    let env = Env::default();
    let contract_id = env.register(DisputeEvidenceHashStore, ());
    let dispute_id = Symbol::new(&env, "dispute_1");
    (env, contract_id, dispute_id)
}

pub fn hash(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

pub fn client<'a>(env: &'a Env, contract_id: &'a Address) -> DisputeEvidenceHashStoreClient<'a> {
    DisputeEvidenceHashStoreClient::new(env, contract_id)
}