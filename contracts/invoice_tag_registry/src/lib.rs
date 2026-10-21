//! Invoice tag registry.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod registry;
mod types;

pub use types::MAX_TAGS;

use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

#[cfg(test)]
mod tests;

/// Stores up to four unique tags on an invoice id.
#[contract]
pub struct InvoiceTagRegistry;

#[contractimpl]
impl InvoiceTagRegistry {
    /// Attaches `tag` to `invoice_id`.
    ///
    /// Returns false when the tag is already stored or the invoice already has
    /// [`MAX_TAGS`] tags. Tags stay in insertion order.
    pub fn add_tag(env: Env, invoice_id: Symbol, tag: Symbol) -> bool {
        registry::add_tag(&env, &invoice_id, tag)
    }

    /// Returns the tags stored for `invoice_id`, or an empty vector.
    pub fn tags_of(env: Env, invoice_id: Symbol) -> Vec<Symbol> {
        registry::tags_of(&env, &invoice_id)
    }
}
