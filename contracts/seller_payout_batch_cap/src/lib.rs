#![no_std]

//! Admin-configured maximum payout batch size.

mod storage;
mod types;

pub use types::{DataKey, Error};

use soroban_sdk::{contract, contractimpl, Address, Env};

#[contract]
pub struct SellerPayoutBatchCap;

#[contractimpl]
impl SellerPayoutBatchCap {
    /// Create the guard with its administrator and initial cap.
    pub fn __constructor(env: Env, admin: Address, initial_max: u32) {
        storage::set_admin(&env, &admin);
        storage::set_max(&env, initial_max);
    }

    /// Replace the current cap. The configured admin must authorize.
    pub fn set_max_batch_size(env: Env, max: u32) {
        storage::admin(&env).require_auth();
        storage::set_max(&env, max);
    }

    /// Return the configured maximum number of entries.
    pub fn max_batch_size(env: Env) -> u32 {
        storage::max(&env)
    }

    /// Return whether all `size` entries fit in one batch.
    pub fn is_batch_allowed(env: Env, size: u32) -> bool {
        size <= storage::max(&env)
    }

    /// Reject an oversized batch before callers process any entries.
    pub fn validate_batch(env: Env, size: u32) -> Result<(), Error> {
        if size <= storage::max(&env) {
            Ok(())
        } else {
            Err(Error::BatchTooLarge)
        }
    }
}
