//! `invoice-draft-flag` — standalone Soroban contract implementing a one-way
//! draft-to-published invoice flag.

#![no_std]
#![deny(unsafe_code)]

pub mod storage;
pub mod types;

pub use crate::types::{DataKey, DraftFlagError};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct InvoiceDraftFlag;

#[contractimpl]
impl InvoiceDraftFlag {
    /// Publish `invoice_id` on behalf of `seller`.
    /// Requires `seller` authorization and fails with [`DraftFlagError::AlreadyPublished`]
    /// if the invoice was already published.
    pub fn publish(
        env: Env,
        seller: Address,
        invoice_id: Symbol,
    ) -> Result<(), DraftFlagError> {
        seller.require_auth();
        if storage::get_publisher(&env, &invoice_id).is_some() {
            return Err(DraftFlagError::AlreadyPublished);
        }
        storage::set_publisher(&env, &invoice_id, &seller);
        Ok(())
    }

    /// Returns `true` while `invoice_id` is still in draft state (not yet published).
    pub fn is_draft(env: Env, invoice_id: Symbol) -> bool {
        storage::get_publisher(&env, &invoice_id).is_none()
    }

    /// Returns `true` once `invoice_id` has been published.
    pub fn is_published(env: Env, invoice_id: Symbol) -> bool {
        storage::get_publisher(&env, &invoice_id).is_some()
    }

    /// Returns the seller `Address` that published `invoice_id`, if published.
    pub fn published_by(env: Env, invoice_id: Symbol) -> Option<Address> {
        storage::get_publisher(&env, &invoice_id)
    }
}
