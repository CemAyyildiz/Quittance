#![no_std]

//! Standalone Soroban contract: one-time late-fee waiver per invoice.
//!
//! An admin granted at deployment can issue a single, non-reversible waiver
//! for an invoice id. Downstream late-fee logic should treat an outstanding
//! waiver as "do not charge"; consuming the waiver removes it forever, so the
//! same invoice can never be waived twice.
//!
//! # Lifecycle
//!
//! Each invoice's waiver moves through a small state machine:
//!
//! ```text
//! (no record) --grant_waiver--> Granted --consume_waiver--> Consumed
//! ```
//!
//! `Consumed` is terminal. `grant_waiver` only succeeds when no record exists
//! yet; re-granting an outstanding or consumed waiver returns `false` and
//! never re-arms it. `consume_waiver` returns `true` exactly once.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `__constructor(admin)` | `fn(Env, Address)` | Stores the admin; runs at deploy. |
//! | `grant_waiver(admin, invoice_id)` | `fn(Env, Address, Symbol) -> Result<bool, Error>` | Grant the waiver (admin-only). |
//! | `has_waiver(invoice_id)` | `fn(Env, Symbol) -> bool` | Outstanding (granted, unused) waiver? |
//! | `consume_waiver(invoice_id)` | `fn(Env, Symbol) -> bool` | Consume the waiver; `true` once. |
//! | `admin()` | `fn(Env) -> Address` | Read back the stored admin. |
//!
//! This crate is standalone: it is not a member of the root
//! `contracts/Cargo.toml` workspace and is not wired into the frontend,
//! backend, or any other contract.

mod storage;
mod types;

pub use types::Error;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
use types::WaiverState;

/// One-time late-fee waiver contract.
#[contract]
pub struct InvoiceGraceFeeWaiver;

#[contractimpl]
impl InvoiceGraceFeeWaiver {
    /// Store the waiver `admin` at deploy time; the admin cannot be reset.
    pub fn __constructor(env: Env, admin: Address) {
        storage::set_admin(&env, &admin);
    }

    /// Return the stored admin address.
    pub fn admin(env: Env) -> Address {
        storage::admin(&env).expect("invoice-grace-fee-waiver admin must be initialized")
    }

    /// Grant a single, non-reversible late-fee waiver for `invoice_id`.
    ///
    /// Returns `true` when the waiver was newly granted. Returns `false` when
    /// a waiver is already outstanding or has already been consumed — a
    /// consumed waiver is terminal and is never re-armed. Admin-only: the
    /// caller must match the stored admin and authorize the call.
    pub fn grant_waiver(env: Env, admin: Address, invoice_id: Symbol) -> Result<bool, Error> {
        require_admin(&env, &admin)?;
        admin.require_auth();

        if storage::waiver_state(&env, &invoice_id).is_some() {
            return Ok(false);
        }
        storage::set_waiver_state(&env, &invoice_id, &WaiverState::Granted);
        Ok(true)
    }

    /// Return whether an outstanding (granted, unused) waiver exists.
    ///
    /// Downstream late-fee logic should skip the charge while this is `true`.
    pub fn has_waiver(env: Env, invoice_id: Symbol) -> bool {
        storage::waiver_state(&env, &invoice_id) == Some(WaiverState::Granted)
    }

    /// Consume the waiver for `invoice_id`, permanently.
    ///
    /// Returns `true` when an outstanding waiver existed and was consumed;
    /// returns `false` when there was nothing to consume (never granted, or
    /// already consumed). The transition is one-way: `Consumed` never leaves.
    pub fn consume_waiver(env: Env, invoice_id: Symbol) -> bool {
        if storage::waiver_state(&env, &invoice_id) == Some(WaiverState::Granted) {
            storage::set_waiver_state(&env, &invoice_id, &WaiverState::Consumed);
            true
        } else {
            false
        }
    }
}

/// Return `Err(NotAuthorised)` unless `candidate` matches the stored admin.
fn require_admin(env: &Env, candidate: &Address) -> Result<(), Error> {
    match storage::admin(env) {
        Some(admin) if &admin == candidate => Ok(()),
        _ => Err(Error::NotAuthorised),
    }
}
