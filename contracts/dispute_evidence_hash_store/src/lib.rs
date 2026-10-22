#![no_std]

mod types;

pub use types::Error;

use soroban_sdk::{contract, contractimpl, BytesN, Env, Symbol};
use types::DataKey;

/// Stores one immutable evidence commitment for each dispute ID.
#[contract]
pub struct DisputeEvidenceHashStore;

#[contractimpl]
impl DisputeEvidenceHashStore {
    /// Store the first evidence hash for a dispute.
    pub fn commit_evidence(
        env: Env,
        dispute_id: Symbol,
        hash: BytesN<32>,
    ) -> Result<(), Error> {
        let key = DataKey::EvidenceHash(dispute_id);
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyCommitted);
        }

        env.storage().persistent().set(&key, &hash);
        Ok(())
    }

    /// Return a dispute's evidence hash, if it has been committed.
    pub fn evidence_hash(env: Env, dispute_id: Symbol) -> Option<BytesN<32>> {
        env.storage()
            .persistent()
            .get(&DataKey::EvidenceHash(dispute_id))
    }
}