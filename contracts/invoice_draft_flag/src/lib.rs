//! `invoice-draft-flag` — standalone Soroban one-way draft-to-published invoice flag.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::check_publishable;
pub use crate::types::{DataKey, Error};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[contract]
pub struct InvoiceDraftFlag;

#[contractimpl]
impl InvoiceDraftFlag {
    /// Publish `invoice_id` on behalf of `seller`. Transitions from draft (`true`)
    /// to published (`is_draft == false`) exactly once.
    pub fn publish(env: Env, seller: Address, invoice_id: Symbol) -> Result<(), Error> {
        seller.require_auth();
        let already = storage::get_publisher(&env, &invoice_id).is_some();
        logic::check_publishable(already, &invoice_id)?;
        storage::set_publisher(&env, &invoice_id, &seller);
        Ok(())
    }

    /// Return `true` if `invoice_id` is still in draft state (not yet published).
    pub fn is_draft(env: Env, invoice_id: Symbol) -> bool {
        storage::get_publisher(&env, &invoice_id).is_none()
    }

    /// Return `true` if `invoice_id` has been published.
    pub fn is_published(env: Env, invoice_id: Symbol) -> bool {
        storage::get_publisher(&env, &invoice_id).is_some()
    }

    /// Return the seller address that published `invoice_id`, if published.
    pub fn published_by(env: Env, invoice_id: Symbol) -> Option<Address> {
        storage::get_publisher(&env, &invoice_id)
    }
}
