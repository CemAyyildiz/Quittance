//! One-time invoice priority flags.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod storage;
mod types;

pub use types::{Error, Priority};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[cfg(test)]
mod tests;

/// Records each invoice's priority exactly once.
#[contract]
pub struct InvoicePriorityFlag;

#[contractimpl]
impl InvoicePriorityFlag {
    /// Set the priority for `invoice_id`, once.
    ///
    /// `seller` must authorize the call. The first call stores the priority;
    /// later calls return `Error::AlreadySet` and keep the original value, so
    /// downstream sorting and display logic can rely on it never changing.
    ///
    /// This primitive does not verify that `seller` owns the invoice; that
    /// check belongs to the invoice flow that integrates it.
    pub fn set_priority(
        env: Env,
        seller: Address,
        invoice_id: Symbol,
        priority: Priority,
    ) -> Result<(), Error> {
        seller.require_auth();

        if storage::is_set(&env, &invoice_id) {
            return Err(Error::AlreadySet);
        }

        storage::store(&env, &invoice_id, priority);
        Ok(())
    }

    /// Return the stored priority for `invoice_id`, or `None` when unset.
    pub fn priority_of(env: Env, invoice_id: Symbol) -> Option<Priority> {
        storage::load(&env, &invoice_id)
    }
}
