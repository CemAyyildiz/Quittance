//! N-of-M payment confirmation quorum.
//!
//! A payment reference is only considered confirmed once a quorum of the
//! configured observer addresses has confirmed it. The observer set (M) is
//! configured once, right after deployment, and the quorum size (N) is supplied
//! by the caller when the reference is evaluated.
//!
//! This crate is standalone: it is not wired into the frontend, the backend or
//! any other contract in this repository.

#![no_std]
#![deny(unsafe_code)]

mod errors;
mod observers;
mod quorum;
mod state;
mod types;

pub use crate::errors::Error;
pub use crate::types::MAX_OBSERVERS;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

/// N-of-M payment confirmation quorum contract.
#[contract]
pub struct ConfirmationQuorum;

#[contractimpl]
impl ConfirmationQuorum {
    /// Configure the quorum exactly once.
    ///
    /// `admin` authorizes the call and is stored so the deployment can be
    /// audited. `observers` is the observer set (M): it must not be empty, must
    /// not exceed `MAX_OBSERVERS` entries, and must not contain the same
    /// address twice.
    pub fn initialize(env: Env, admin: Address, observers: Vec<Address>) -> Result<(), Error> {
        admin.require_auth();
        if state::is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }
        observers::validate(&observers)?;
        state::set_admin(&env, &admin);
        state::set_observers(&env, &observers);
        state::set_initialized(&env);
        Ok(())
    }

    /// Record one observer's confirmation of a payment reference.
    ///
    /// The confirming observer authorizes the call, so nobody else can confirm
    /// on its behalf. The observer must belong to the configured set and must
    /// not have confirmed the same reference before.
    pub fn confirm(env: Env, observer: Address, reference: Symbol) -> Result<(), Error> {
        observer.require_auth();
        if !state::is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        let observers = state::observers(&env);
        if !observers::contains(&observers, &observer) {
            return Err(Error::NotObserver);
        }
        if state::has_confirmed(&env, &reference, &observer) {
            return Err(Error::AlreadyConfirmed);
        }
        state::record_confirmation(&env, &reference, &observer);
        Ok(())
    }

    /// Return whether at least `threshold` observers confirmed `reference`.
    ///
    /// `threshold` is the quorum size (N). It is inclusive, so exactly
    /// `threshold` confirmations already satisfy the quorum. A threshold of `0`
    /// is trivially satisfied.
    pub fn is_confirmed(env: Env, reference: Symbol, threshold: u32) -> bool {
        quorum::is_met(state::confirmation_count(&env, &reference), threshold)
    }

    /// Return how many distinct observers confirmed `reference`.
    pub fn confirmation_count(env: Env, reference: Symbol) -> u32 {
        state::confirmation_count(&env, &reference)
    }

    /// Return how many confirmations are still missing to satisfy a quorum of
    /// `threshold` confirmations for `reference`.
    pub fn confirmations_needed(env: Env, reference: Symbol, threshold: u32) -> u32 {
        quorum::remaining(state::confirmation_count(&env, &reference), threshold)
    }

    /// Return whether `observer` already confirmed `reference`.
    pub fn has_confirmed(env: Env, observer: Address, reference: Symbol) -> bool {
        state::has_confirmed(&env, &reference, &observer)
    }

    /// Return the configured observer set (M observers).
    pub fn observers(env: Env) -> Vec<Address> {
        state::observers(&env)
    }

    /// Return the size of the configured observer set (M).
    pub fn observer_count(env: Env) -> u32 {
        state::observers(&env).len()
    }

    /// Return whether `observer` belongs to the configured observer set.
    pub fn is_observer(env: Env, observer: Address) -> bool {
        observers::contains(&state::observers(&env), &observer)
    }

    /// Return the admin address, or `None` when the quorum is not configured.
    pub fn admin(env: Env) -> Option<Address> {
        state::admin(&env)
    }
}
