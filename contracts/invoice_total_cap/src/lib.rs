#![no_std]

//! `invoice-total-cap` — a standalone Soroban primitive for capping the
//! total value invoiced by a seller.
//!
//! The contract keeps one running total per seller and one global,
//! admin-configured cap. [`InvoiceTotalCap::record_invoice`] adds an invoice
//! to the seller's total only when the new total stays at or below the cap.
//!
//! The arithmetic is also exposed as a pure function,
//! [`would_exceed_cap`], for off-chain pre-checks and simulation.
//!
//! This crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.

use soroban_sdk::{contract, contractimpl, Address, Env};

mod cap;
mod types;

pub use crate::cap::{checked_total, is_valid_amount, remaining_capacity, would_exceed_cap};
pub use crate::types::{
    CapError, CapUpdatedEvent, DataKey, InitializedEvent, InvoiceRecordedEvent,
};

/// Read the configured admin address.
fn load_admin(env: &Env) -> Result<Address, CapError> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(CapError::NotInitialized)
}

/// Read the configured per-seller cap.
fn load_cap(env: &Env) -> Result<i128, CapError> {
    env.storage()
        .instance()
        .get(&DataKey::Cap)
        .ok_or(CapError::NotInitialized)
}

/// Read a seller's running total, defaulting to zero for a new seller.
fn load_total(env: &Env, seller: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::SellerTotal(seller.clone()))
        .unwrap_or(0)
}

/// Per-seller invoice total cap.
///
/// The contract has a single admin and a single cap. Each seller has an
/// independent running total, so one seller exhausting the cap does not
/// consume another seller's capacity.
#[contract]
pub struct InvoiceTotalCap;

#[contractimpl]
impl InvoiceTotalCap {
    /// Configure the contract with an admin and an initial cap.
    ///
    /// The admin must authorize the call. The cap must be non-negative.
    /// Initialization may happen exactly once; use
    /// [`InvoiceTotalCap::set_cap`] afterwards.
    pub fn initialize(env: Env, admin: Address, cap: i128) -> Result<(), CapError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(CapError::AlreadyInitialized);
        }
        if cap < 0 {
            return Err(CapError::InvalidCap);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Cap, &cap);
        env.events().publish_event(&InitializedEvent {
            admin: admin.clone(),
            cap,
        });

        Ok(())
    }

    /// Change the cap. Only the configured admin may call this.
    ///
    /// Lowering the cap does not retroactively change stored running totals;
    /// it only affects future calls to [`InvoiceTotalCap::record_invoice`]
    /// and [`InvoiceTotalCap::would_exceed_cap_for`].
    pub fn set_cap(env: Env, admin: Address, cap: i128) -> Result<(), CapError> {
        let configured_admin = load_admin(&env)?;
        if admin != configured_admin {
            return Err(CapError::Unauthorized);
        }
        if cap < 0 {
            return Err(CapError::InvalidCap);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Cap, &cap);
        env.events().publish_event(&CapUpdatedEvent {
            admin: admin.clone(),
            cap,
        });

        Ok(())
    }

    /// Return the currently configured cap.
    pub fn cap(env: Env) -> Result<i128, CapError> {
        load_cap(&env)
    }

    /// Return a seller's current running total. Unknown sellers have a total
    /// of zero.
    pub fn running_total(env: Env, seller: Address) -> i128 {
        load_total(&env, &seller)
    }

    /// Record an invoice for `seller` and return the updated running total.
    ///
    /// The seller must authorize the call. The amount must be strictly
    /// positive. The call fails with [`CapError::CapExceeded`] when the new
    /// total would be greater than the configured cap, leaving the stored
    /// total unchanged.
    pub fn record_invoice(
        env: Env,
        seller: Address,
        amount: i128,
    ) -> Result<i128, CapError> {
        if !is_valid_amount(amount) {
            return Err(CapError::InvalidAmount);
        }

        seller.require_auth();

        let cap = load_cap(&env)?;
        let current = load_total(&env, &seller);
        let new_total = checked_total(current, amount).ok_or(CapError::Overflow)?;

        if new_total > cap {
            return Err(CapError::CapExceeded);
        }

        env.storage()
            .persistent()
            .set(&DataKey::SellerTotal(seller.clone()), &new_total);
        env.events().publish_event(&InvoiceRecordedEvent {
            seller: seller.clone(),
            amount,
            new_total,
        });

        Ok(new_total)
    }

    /// Pure cap predicate with the same argument shape as the documented
    /// off-chain API.
    ///
    /// `seller` is part of the query shape so that off-chain callers can
    /// batch simulations per seller without changing the numeric contract.
    /// The result depends only on `running_total`, `new_amount`, and `cap`.
    #[must_use]
    pub fn would_exceed_cap(
        _seller: Address,
        running_total: i128,
        new_amount: i128,
        cap: i128,
    ) -> bool {
        cap::would_exceed_cap(running_total, new_amount, cap)
    }

    /// State-aware variant of [`InvoiceTotalCap::would_exceed_cap`]: checks
    /// `new_amount` against the seller's stored total and the configured cap.
    ///
    /// Returns [`CapError::NotInitialized`] before initialization and
    /// [`CapError::InvalidAmount`] for a non-positive amount.
    pub fn would_exceed_cap_for(
        env: Env,
        seller: Address,
        new_amount: i128,
    ) -> Result<bool, CapError> {
        if !is_valid_amount(new_amount) {
            return Err(CapError::InvalidAmount);
        }

        let cap = load_cap(&env)?;
        let current = load_total(&env, &seller);
        Ok(cap::would_exceed_cap(current, new_amount, cap))
    }

    /// Remaining capacity for `seller` under the current cap.
    ///
    /// Returns zero when the seller is already at or above the cap.
    pub fn remaining_for(env: Env, seller: Address) -> Result<i128, CapError> {
        let cap = load_cap(&env)?;
        let current = load_total(&env, &seller);
        Ok(remaining_capacity(current, cap))
    }
}

#[cfg(test)]
mod test;
