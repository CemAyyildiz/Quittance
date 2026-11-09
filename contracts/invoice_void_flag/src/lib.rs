//! `invoice-void-flag` — standalone Soroban contract: one-time invoice void flag.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::ensure_can_void;
pub use crate::types::{DataKey, Error, InvoiceState};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// One-time invoice void flag contract.
#[contract]
pub struct InvoiceVoidFlag;

#[contractimpl]
impl InvoiceVoidFlag {
    /// Void `invoice_id` on behalf of `seller` exactly once.
    ///
    /// Requires `seller` authorization. Fails if `invoice_id` is already
    /// voided ([`Error::AlreadyVoid`]), paid ([`Error::AlreadyPaid`]),
    /// expired ([`Error::InvoiceExpired`]), or owned by a different seller
    /// ([`Error::UnauthorizedSeller`]).
    pub fn void_invoice(env: Env, seller: Address, invoice_id: Symbol) -> Result<(), Error> {
        seller.require_auth();
        logic::apply_void(&env, &seller, &invoice_id)
    }

    /// Return `true` if `invoice_id` has been voided.
    pub fn is_void(env: Env, invoice_id: Symbol) -> bool {
        storage::get_state(&env, &invoice_id) == InvoiceState::Void
    }

    /// Return the current [`InvoiceState`] of `invoice_id`.
    pub fn state_of(env: Env, invoice_id: Symbol) -> InvoiceState {
        storage::get_state(&env, &invoice_id)
    }

    /// Optionally pre-register `seller` as the owner of `invoice_id`.
    pub fn register_invoice(env: Env, seller: Address, invoice_id: Symbol) -> Result<(), Error> {
        seller.require_auth();
        if storage::get_owner(&env, &invoice_id).is_some() {
            return Err(Error::AlreadyRegistered);
        }
        storage::set_owner(&env, &invoice_id, &seller);
        Ok(())
    }

    /// Mark an open invoice as paid so it can no longer be voided.
    pub fn mark_paid(env: Env, invoice_id: Symbol) -> Result<(), Error> {
        match storage::get_state(&env, &invoice_id) {
            InvoiceState::Open => {
                storage::set_state(&env, &invoice_id, InvoiceState::Paid);
                Ok(())
            }
            InvoiceState::Void => Err(Error::AlreadyVoid),
            InvoiceState::Paid => Err(Error::AlreadyPaid),
            InvoiceState::Expired => Err(Error::InvoiceExpired),
        }
    }

    /// Mark an open invoice as expired so it can no longer be voided.
    pub fn mark_expired(env: Env, invoice_id: Symbol) -> Result<(), Error> {
        match storage::get_state(&env, &invoice_id) {
            InvoiceState::Open => {
                storage::set_state(&env, &invoice_id, InvoiceState::Expired);
                Ok(())
            }
            InvoiceState::Void => Err(Error::AlreadyVoid),
            InvoiceState::Paid => Err(Error::AlreadyPaid),
            InvoiceState::Expired => Err(Error::InvoiceExpired),
        }
    }
}
