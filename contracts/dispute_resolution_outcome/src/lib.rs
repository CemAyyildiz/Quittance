#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Env, Symbol};
pub use types::{DataKey, DisputeOutcomeError, Outcome};
pub use validator::{ensure_unresolved, payer_share_bps};

#[contract]
pub struct DisputeResolutionOutcomeContract;

#[contractimpl]
impl DisputeResolutionOutcomeContract {
    /// Records the immutable resolution `outcome` (`FavorPayer`, `FavorSeller`, or `Split`)
    /// for `dispute_id`. Fails if `dispute_id` has already been resolved.
    pub fn resolve(
        env: Env,
        dispute_id: Symbol,
        outcome: Outcome,
    ) -> Result<(), DisputeOutcomeError> {
        let key = DataKey::Outcome(dispute_id);
        let existing: Option<Outcome> = env.storage().persistent().get(&key);
        ensure_unresolved(existing)?;
        env.storage().persistent().set(&key, &outcome);
        Ok(())
    }

    /// Returns the recorded `Outcome` for `dispute_id`, or `None` if unresolved.
    pub fn outcome_of(env: Env, dispute_id: Symbol) -> Option<Outcome> {
        env.storage()
            .persistent()
            .get(&DataKey::Outcome(dispute_id))
    }

    /// Returns `true` if `dispute_id` has already been resolved.
    pub fn is_resolved(env: Env, dispute_id: Symbol) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Outcome(dispute_id))
    }

    /// Returns the resolved `Outcome` or `Err(NotResolved)` if still open.
    pub fn require_outcome(env: Env, dispute_id: Symbol) -> Result<Outcome, DisputeOutcomeError> {
        Self::outcome_of(env, dispute_id).ok_or(DisputeOutcomeError::NotResolved)
    }
}
