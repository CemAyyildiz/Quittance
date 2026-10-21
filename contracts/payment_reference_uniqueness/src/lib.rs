#![no_std]

//! `payment-reference-uniqueness` — a standalone Soroban primitive that
//! enforces global uniqueness of payment reference strings.
//!
//! The contract keeps a registry of claimed references. The first caller to
//! claim a reference wins; every later attempt to claim the same reference
//! is rejected. Two payments can therefore never carry the same reference,
//! which is what makes a reference usable as an idempotency key.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.

use soroban_sdk::{contract, contractimpl, Env, Symbol};

mod reference;
mod types;

pub use crate::reference::{
    has_valid_charset, is_valid_reference, MAX_REFERENCE_LEN,
};
pub use crate::types::{DataKey, Error, ReferenceClaimedEvent};

/// Read the number of claimed references.
fn load_count(env: &Env) -> u32 {
    env.storage().instance().get(&DataKey::Count).unwrap_or(0)
}

/// Write the number of claimed references.
fn store_count(env: &Env, count: u32) {
    env.storage().instance().set(&DataKey::Count, &count);
}

/// Claim `reference` for the first time.
///
/// Returns `true` when the reference was free and is now claimed, and
/// `false` when it had already been claimed. The claim registry is global,
/// so the reference stays claimed forever.
fn claim(env: &Env, reference: &Symbol) -> bool {
    let key = DataKey::Claim(reference.clone());
    if env.storage().persistent().has(&key) {
        return false;
    }

    env.storage().persistent().set(&key, &true);
    let count = load_count(env);
    store_count(env, count.saturating_add(1));
    env.events().publish_event(&ReferenceClaimedEvent {
        reference: reference.clone(),
    });

    true
}

/// Global uniqueness registry for payment references.
#[contract]
pub struct PaymentReferenceUniqueness;

#[contractimpl]
impl PaymentReferenceUniqueness {
    /// Claim a payment reference.
    ///
    /// Returns `true` when the reference was claimed by this call and
    /// `false` when it had already been claimed before. The reference is
    /// stored permanently: it is never released, so the same reference can
    /// never be recorded twice.
    pub fn claim_reference(env: Env, reference: Symbol) -> bool {
        claim(&env, &reference)
    }

    /// Claim a payment reference, reporting failures as a contract error.
    ///
    /// Returns `Ok(())` when the reference was free, and
    /// [`Error::AlreadyClaimed`] when it had already been claimed.
    pub fn claim_reference_checked(env: Env, reference: Symbol) -> Result<(), Error> {
        if claim(&env, &reference) {
            Ok(())
        } else {
            Err(Error::AlreadyClaimed)
        }
    }

    /// Return `true` when the reference has been claimed.
    pub fn is_claimed(env: Env, reference: Symbol) -> bool {
        env.storage().persistent().has(&DataKey::Claim(reference))
    }

    /// Return the number of claimed references.
    pub fn claimed_count(env: Env) -> u32 {
        load_count(&env)
    }
}

#[cfg(test)]
mod test;
