#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol};

pub mod resolution;
pub mod types;

#[cfg(test)]
mod tests;

use types::{DisputeError, Outcome};

#[contract]
pub struct DisputeResolutionOutcome;

#[contractimpl]
impl DisputeResolutionOutcome {
    pub fn resolve(
        env: Env,
        dispute_id: Symbol,
        outcome: Outcome,
    ) -> Result<(), DisputeError> {
        resolution::record_outcome(&env, &dispute_id, outcome)
    }

    pub fn outcome_of(
        env: Env,
        dispute_id: Symbol,
    ) -> Option<Outcome> {
        resolution::get_outcome(&env, &dispute_id)
    }

    pub fn is_resolved(
        env: Env,
        dispute_id: Symbol,
    ) -> bool {
        resolution::has_outcome(&env, &dispute_id)
    }
}
