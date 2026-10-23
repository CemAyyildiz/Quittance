//! Storage access for the `refund-reason-code` crate.
//!
//! Every refund id owns one persistent entry. The first write wins: later
//! writes are rejected instead of overwriting, which is what makes the
//! recorded reason immutable.

use soroban_sdk::{Env, Symbol};

use crate::types::{DataKey, Error, ReasonCode};

/// Persistent entries are bumped back out to 90 days once they get within
/// 30 days of expiry, so a recorded reason stays readable for the usual
/// invoice retention window.
const TTL_THRESHOLD: u32 = 30 * 17_280;
const TTL_BUMP: u32 = 90 * 17_280;

/// Build the storage key for a refund id.
fn key(refund_id: &Symbol) -> DataKey {
    DataKey::Reason(refund_id.clone())
}

/// Record `reason` for `refund_id`.
///
/// Returns [`Error::AlreadyRecorded`] when a reason already exists for this
/// refund id, and leaves the stored reason untouched in that case.
pub(crate) fn record(env: &Env, refund_id: &Symbol, reason: ReasonCode) -> Result<(), Error> {
    let key = key(refund_id);
    if env.storage().persistent().has(&key) {
        return Err(Error::AlreadyRecorded);
    }

    env.storage().persistent().set(&key, &reason);
    env.storage()
        .persistent()
        .extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
    Ok(())
}

/// Read the reason recorded for `refund_id`, or `None` when nothing has been
/// recorded yet.
pub(crate) fn read(env: &Env, refund_id: &Symbol) -> Option<ReasonCode> {
    let key = key(refund_id);
    let reason: Option<ReasonCode> = env.storage().persistent().get(&key);

    if reason.is_some() {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_BUMP);
    }

    reason
}
