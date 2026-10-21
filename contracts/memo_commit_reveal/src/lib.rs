#![no_std]

//! `memo-commit-reveal` — a standalone Soroban primitive for the
//! commit-reveal pattern applied to payment memos.
//!
//! A payer commits the SHA-256 hash of a memo now, and reveals the memo
//! itself later. The contract only learns the plaintext memo once the
//! matching commitment exists, which lets a memo be published without
//! revealing its contents at commit time.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.

use soroban_sdk::{contract, contractimpl, BytesN, Env, String};

mod hash;
mod types;

pub use crate::hash::{memo_hash, memo_hash_hex, MAX_MEMO_BYTES};
pub use crate::types::{CancelledEvent, CommittedEvent, DataKey, Error, RevealedEvent};

/// Compute the digest of a memo with the Soroban host SHA-256 function.
///
/// The memo length is validated against [`MAX_MEMO_BYTES`] first, mirroring
/// Stellar's `MEMO_TEXT` limit.
fn digest_of(env: &Env, memo: &String) -> Result<BytesN<32>, Error> {
    if memo.len() > MAX_MEMO_BYTES {
        return Err(Error::MemoTooLong);
    }
    Ok(env.crypto().sha256(&memo.to_bytes()).to_bytes())
}

/// Read the number of pending commitments.
fn load_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::Count).unwrap_or(0)
}

/// Write the number of pending commitments.
fn store_count(env: &Env, count: u32) {
    env.storage().instance().set(&DataKey::Count, &count);
}

/// Commit-reveal registry for payment memo hashes.
#[contract]
pub struct MemoCommitReveal;

#[contractimpl]
impl MemoCommitReveal {
    /// Commit to a memo hash.
    ///
    /// Returns `true` when the commitment was stored and `false` when the
    /// same hash was already pending. Committing the same hash twice is
    /// therefore idempotent and never creates a second pending slot.
    pub fn commit(env: Env, hash: BytesN<32>) -> bool {
        let key = DataKey::Commitment(hash.clone());
        if env.storage().persistent().has(&key) {
            return false;
        }

        env.storage().persistent().set(&key, &true);
        let count = load_count(&env);
        store_count(&env, count.saturating_add(1));
        env.events().publish_event(&CommittedEvent { hash });

        true
    }

    /// Reveal a memo.
    ///
    /// The memo is hashed with SHA-256 and matched against the pending
    /// commitments. When the digest matches, the commitment is consumed and
    /// the call returns `Ok(true)`. When no commitment matches, the call
    /// returns `Ok(false)` and **no** commitment is consumed, so the payer
    /// can try again later.
    ///
    /// Returns [`Error::MemoTooLong`] when the memo is longer than
    /// [`MAX_MEMO_BYTES`].
    pub fn reveal(env: Env, memo: String) -> Result<bool, Error> {
        let digest = digest_of(&env, &memo)?;
        let key = DataKey::Commitment(digest.clone());

        if !env.storage().persistent().has(&key) {
            return Ok(false);
        }

        env.storage().persistent().remove(&key);
        let count = load_count(&env);
        store_count(&env, count.saturating_sub(1));
        env.events().publish_event(&RevealedEvent { hash: digest });

        Ok(true)
    }

    /// Return `true` when a hash is currently pending.
    pub fn is_committed(env: Env, hash: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Commitment(hash))
    }

    /// Return the number of pending commitments.
    pub fn pending_count(env: Env) -> u32 {
        load_count(&env)
    }

    /// Cancel a pending commitment.
    ///
    /// Returns `true` when a commitment was removed and `false` when there
    /// was nothing to cancel.
    pub fn cancel(env: Env, hash: BytesN<32>) -> bool {
        let key = DataKey::Commitment(hash.clone());
        if !env.storage().persistent().has(&key) {
            return false;
        }

        env.storage().persistent().remove(&key);
        let count = load_count(&env);
        store_count(&env, count.saturating_sub(1));
        env.events().publish_event(&CancelledEvent { hash });

        true
    }
}

#[cfg(test)]
mod test;
