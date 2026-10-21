//! Instance-storage accessors for `settlement-batch-id`.

use crate::types::{Batch, DataKey};
use soroban_sdk::{Env, Symbol};

/// Read the batch stored under `batch_id`, if any.
pub fn batch(env: &Env, batch_id: &Symbol) -> Option<Batch> {
    env.storage()
        .instance()
        .get(&DataKey::Batch(batch_id.clone()))
}

/// Persist a batch under `batch_id`.
pub fn set_batch(env: &Env, batch_id: &Symbol, batch: &Batch) {
    env.storage()
        .instance()
        .set(&DataKey::Batch(batch_id.clone()), batch);
}

/// Read the number of batches started so far.
pub fn batch_count(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::BatchCount)
        .unwrap_or(0)
}

/// Increment and return the number of batches started so far.
pub fn increment_batch_count(env: &Env) -> u32 {
    let count = batch_count(env) + 1;
    env.storage().instance().set(&DataKey::BatchCount, &count);
    count
}
