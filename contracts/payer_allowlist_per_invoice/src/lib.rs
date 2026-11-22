//! Per-invoice payer allowlist.
//!
//! Standalone Soroban contract that maintains an optional allowlist of payer
//! addresses permitted to pay a specific invoice. Each invoice has its own
//! independent allowlist.
//!
//! This contract is not wired into the Quittance frontend, backend, or any
//! other contract in this repository.

#![no_std]

mod allowlist;
mod storage;
mod types;
mod validation;

pub use types::DataKey;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

#[cfg(test)]
mod tests;

/// Per-invoice payer allowlist contract.
#[contract]
pub struct PayerAllowlistPerInvoice;

#[contractimpl]
impl PayerAllowlistPerInvoice {
    /// Sets the allowlist for a given invoice.
    ///
    /// # Arguments
    /// * `invoice_id` - Unique identifier for the invoice
    /// * `payers` - Vector of addresses allowed to pay this invoice.
    ///              An empty vector clears the allowlist (allowing all payers).
    pub fn set_allowlist(env: Env, invoice_id: Symbol, payers: Vec<Address>) {
        allowlist::set_allowlist(&env, &invoice_id, &payers);
    }

    /// Checks if a payer is allowed to pay a specific invoice.
    ///
    /// # Arguments
    /// * `invoice_id` - Unique identifier for the invoice
    /// * `payer` - Address to check
    ///
    /// # Returns
    /// * `true` if the payer is allowed (no allowlist set or payer is in the list)
    /// * `false` if an allowlist exists and the payer is not in it
    pub fn is_allowed(env: Env, invoice_id: Symbol, payer: Address) -> bool {
        allowlist::is_allowed(&env, &invoice_id, &payer)
    }
}
