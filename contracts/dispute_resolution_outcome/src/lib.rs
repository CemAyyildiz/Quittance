//! `dispute-resolution-outcome` — standalone Soroban contract: write-once
//! dispute resolution outcome.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::payout_shares_bps;
pub use crate::types::{DataKey, Error, Outcome};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

/// Immutable write-once dispute resolution outcome contract.
#[contract]
pub struct DisputeResolutionOutcome;

#[contractimpl]
impl DisputeResolutionOutcome {
    /// Record the final `outcome` for `dispute_id`.
    ///
    /// Succeeds on the first call for `dispute_id`; any subsequent call for the
    /// same `dispute_id` returns [`Error::AlreadyResolved`] and leaves the
    /// original outcome unchanged.
    pub fn resolve(env: Env, dispute_id: Symbol, outcome: Outcome) -> Result<(), Error> {
        logic::resolve_once(&env, &dispute_id, outcome)
    }

    /// Return the recorded [`Outcome`] for `dispute_id`, or `None` if the
    /// dispute has not been resolved yet.
    pub fn outcome_of(env: Env, dispute_id: Symbol) -> Option<Outcome> {
        storage::get_outcome(&env, &dispute_id)
    }

    /// Return `true` if `dispute_id` has already been resolved.
    pub fn is_resolved(env: Env, dispute_id: Symbol) -> bool {
        storage::get_outcome(&env, &dispute_id).is_some()
    }
}
